'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'

// Disabled while the confirmation is on its way, so a double press can't
// send it twice
export function NewsletterConfirmButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Confirming…' : 'Confirm subscription'}
    </Button>
  )
}
