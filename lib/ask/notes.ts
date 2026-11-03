export const NOTES = `
## My work

## What I'm looking for right now

## Things I believe
`

export function notesForPrompt(): string {
  const withoutComments = NOTES.replace(/<!--[\s\S]*?-->/g, '')
  const sections = withoutComments
    .split(/^## /m)
    .map((section) => section.trim())
    .filter(Boolean)
    .map((section) => {
      const [title, ...body] = section.split('\n')
      return { title: title.trim(), body: body.join('\n').trim() }
    })
    .filter((section) => section.body)
  return sections.map((section) => `${section.title}:\n${section.body}`).join('\n\n')
}
