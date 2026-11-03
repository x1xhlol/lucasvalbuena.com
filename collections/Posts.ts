import type { CollectionConfig } from 'payload'
import { newsletterAfterChange } from '@/lib/newsletter/post-hook'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'publishedAt'],
  },
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [newsletterAfterChange],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      required: true,
      maxLength: 300,
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
    },
    {
      name: 'tags',
      type: 'array',
      fields: [
        {
          name: 'tag',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'newsletterSend',
      type: 'checkbox',
      label: 'Email subscribers when published',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description:
          'Sends a short teaser to subscribers 10 minutes after the post is first published. Cancel it in Resend → Broadcasts within that window.',
      },
    },
    {
      name: 'newsletterSendTest',
      type: 'checkbox',
      label: 'Send me a test',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Emails the teaser to NEWSLETTER_TEST_TO when you save, then turns itself off. Works on drafts.',
      },
    },
    {
      name: 'newsletterSentAt',
      type: 'date',
      label: 'Emailed to subscribers',
      admin: {
        position: 'sidebar',
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime' },
        condition: (data) => Boolean(data?.newsletterSentAt),
      },
    },
    {
      name: 'newsletterBroadcastId',
      type: 'text',
      label: 'Resend broadcast',
      admin: {
        position: 'sidebar',
        readOnly: true,
        condition: (data) => Boolean(data?.newsletterBroadcastId),
      },
    },
  ],
}
