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

const DEFAULT_MODEL = 'anthropic/claude-sonnet-5.5'
const FALLBACK_MODEL = 'anthropic/claude-opus-4.8'
const MAX_TOKENS = 2000
const MAX_ANSWER_LENGTH = 4000

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

  client ??= new Anthropic({
    baseURL: 'https://openrouter.ai/api',
    apiKey: null,
    authToken: apiKey,
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
        { type: 'text', text: `Today's date is ${new Date().toISOString().slice(0, 10)}.` },
      ],
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
        outcome = message.stop_reason === 'refusal' ? 'refused' : 'answered'
        send(outcome === 'refused' ? { type: 'refusal' } : { type: 'done' })
      } catch (error) {
        if (request.signal.aborted) {
          outcome = 'stopped'
        } else {
          const busy = error instanceof Anthropic.RateLimitError || error instanceof Anthropic.InternalServerError
          if (!busy) console.error('Ask request failed:', error)
          send({ type: 'error', code: busy ? 'busy' : 'failed' })
        }
      } finally {
        await logQuestion(question, answer, outcome)
        try {
          controller.close()
        } catch {
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
