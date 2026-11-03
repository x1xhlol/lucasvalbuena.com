// Things only Lucas can say, in his own words. The lock treats this as the
// most authoritative part of its profile. Text inside <!-- --> is a prompt for
// whoever edits this file and is stripped before the lock sees it; sections
// left empty are skipped.
export const NOTES = `
## My work

## What I'm looking for right now

## Things I believe
`

// Drops the editing prompts and any section that ended up empty
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
