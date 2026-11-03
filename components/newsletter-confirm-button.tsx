'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'

export function NewsletterConfirmButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Confirming…' : 'Confirm subscription'}
    </Button>
  )
}
