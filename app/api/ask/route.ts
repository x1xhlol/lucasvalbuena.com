import Anthropic from '@anthropic-ai/sdk'
import { buildAskSystemPrompt } from '@/lib/ask/context'
import { getPayloadClient } from '@/lib/payload'
import {
  MAX_CONVERSATION_CHARS,
  MAX_QUESTION_LENGTH,
  type AskErrorCode,
  type AskEvent,
  type AskMessage,
} from '@/lib/ask/protocol'

export const maxDuration = 60

// Requests go through OpenRouter's Anthropic-compatible Messages endpoint, so
// model ids use OpenRouter's slugs. ASK_MODEL overrides the default.
// Sonnet 5.5 starts answering in about a second, against about three for
// Opus 5.5, and held the lock's voice in testing
const DEFAULT_MODEL = 'anthropic/claude-sonnet-5.5'
// Retried server-side when the model's safety classifiers decline a request.
// Haiku has no server-side fallback, so its requests go without one.
const FALLBACK_MODEL = 'anthropic/claude-opus-4.8'
// Answers are a few sentences; this also caps the cost of a single request
const MAX_TOKENS = 2000
// Long enough for a previous answer, short enough that history can't be used
// to stuff the context
const MAX_ANSWER_LENGTH = 4000

// Rate limiting happens before this function runs, in the Vercel Firewall
// rule "Ask rate limit" (see AGENTS.md). The OpenRouter key's credit limit is
// the hard ceiling on spend.

// History must alternate user/assistant, start and end with a question, and
// stay within the size limits
function parseMessages(body: unknown): AskMessage[] | null {
  const messages = (body as { messages?: unknown } | null)?.messages
  if (!Array.isArray(messages) || messages.length === 0) return null
  const parsed: AskMessage[] = []
  for (const [index, message] of messages.entries()) {
    const role = index % 2 === 0 ? 'user' : 'assistant'
    const content = (message as { content?: unknown } | null)?.content
    if ((message as { role?: unknown }).role !== role || typeof content !== 'string') return null
    const text = content.trim()
    const limit = role === 'user' ? MAX_QUESTION_LENGTH : MAX_ANSWER_LENGTH
    if (text.length === 0 || text.length > limit) return null
    parsed.push({ role, content: text })
  }
  const size = parsed.reduce((total, message) => total + message.content.length, 0)
  return parsed.at(-1)?.role === 'user' && size <= MAX_CONVERSATION_CHARS ? parsed : null
}

function errorResponse(code: AskErrorCode, status: number) {
  return Response.json({ error: code }, { status, headers: { 'Cache-Control': 'no-store' } })
}

type Outcome = 'answered' | 'stopped' | 'refused' | 'failed'

// Saved so Lucas can see what people ask and what the lock couldn't answer.
// No IP or other identifier is stored. Best effort: a slow or missing
// database never affects the answer.
async function logQuestion(question: string, answer: string, outcome: Outcome) {
  try {
    const payload = await getPayloadClient()
    await Promise.race([
      payload.create({
        collection: 'ask-questions',
        data: { question, answer: answer || undefined, outcome },
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timed out')), 3000)),
    ])
  } catch (error) {
    console.error('Could not save an Ask question:', error)
  }
}

let client: Anthropic | null = null

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return errorResponse('offline', 503)

  const messages = parseMessages(await request.json().catch(() => null))
  if (!messages) return errorResponse('invalid', 400)

  // OpenRouter authenticates with a bearer token; apiKey: null keeps the SDK
  // from also sending an ANTHROPIC_API_KEY it might find in the environment
  client ??= new Anthropic({
    baseURL: 'https://openrouter.ai/api',
    apiKey: null,
    authToken: apiKey,
    // Next's patched fetch otherwise reads the whole upstream response for its
    // data cache before handing it over, so answers arrived in one burst
    fetchOptions: { cache: 'no-store' },
  })

  const model = process.env.ASK_MODEL || DEFAULT_MODEL
  const system = await buildAskSystemPrompt()
  const stream = client.beta.messages.stream(
    {
      model,
      max_tokens: MAX_TOKENS,
      system: [
        { type: 'text', text: system, cache_control: { type: 'ephemeral' } },
        // After the cache breakpoint so the date doesn't invalidate it
        { type: 'text', text: `Today's date is ${new Date().toISOString().slice(0, 10)}.` },
      ],
      // The newest question is a cache breakpoint too, so in a long chat the
      // next question reuses everything before it instead of paying for it
      messages: messages.map((message, index) =>
        index === messages.length - 1
          ? { role: message.role, content: [{ type: 'text' as const, text: message.content, cache_control: { type: 'ephemeral' as const } }] }
          : message,
      ),
      output_config: { effort: 'low' },
      ...(model.includes('haiku')
        ? {}
        : { betas: ['server-side-fallback-2026-06-01'], fallbacks: [{ model: FALLBACK_MODEL }] }),
    },
    { signal: request.signal },
  )

  const question = messages[messages.length - 1].content
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AskEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
      let answer = ''
      let outcome: Outcome = 'failed'
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            answer += event.delta.text
            send({ type: 'text', text: event.delta.text })
          }
        }
        const message = await stream.finalMessage()
        // A refusal can arrive after partial text; the client drops it
        outcome = message.stop_reason === 'refusal' ? 'refused' : 'answered'
        send(outcome === 'refused' ? { type: 'refusal' } : { type: 'done' })
      } catch (error) {
        if (request.signal.aborted) {
          // A visitor pressing Stop aborts the request; nobody is listening
          outcome = 'stopped'
        } else {
          const busy = error instanceof Anthropic.RateLimitError || error instanceof Anthropic.InternalServerError
          if (!busy) console.error('Ask request failed:', error)
          send({ type: 'error', code: busy ? 'busy' : 'failed' })
        }
      } finally {
        // After the last event, so saving never delays an answer
        await logQuestion(question, answer, outcome)
        try {
          controller.close()
        } catch {
          // Already closed by a cancelled request
        }
      }
    },
    cancel() {
      stream.abort()
    },
  })

  return new Response(body, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
