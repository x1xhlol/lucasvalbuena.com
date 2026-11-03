import type { CollectionConfig } from 'payload'

// What visitors ask the lock on /ask, so gaps in its knowledge show up.
// Written by app/api/ask/route.ts through the local API. No IP address or any
// other identifier is stored, and only signed-in users can read entries.
export const AskQuestions: CollectionConfig = {
  slug: 'ask-questions',
  labels: { singular: 'Ask question', plural: 'Ask questions' },
  admin: {
    useAsTitle: 'question',
    defaultColumns: ['question', 'outcome', 'createdAt'],
    description: 'Questions visitors asked the lock on /ask. Nothing that identifies them is stored.',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'question',
      type: 'textarea',
      required: true,
    },
    {
      name: 'answer',
      type: 'textarea',
    },
    {
      name: 'outcome',
      type: 'select',
      required: true,
      options: [
        { label: 'Answered', value: 'answered' },
        { label: 'Stopped by visitor', value: 'stopped' },
        { label: 'Declined', value: 'refused' },
        { label: 'Failed', value: 'failed' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}
