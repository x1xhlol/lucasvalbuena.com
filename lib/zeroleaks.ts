export const ZEROLEAKS_PRICING_URL = 'https://zeroleaks.ai/pricing'

export interface ZeroLeaksPlan {
  name: string
  monthly: number | null
  detail: string
}

export const ZEROLEAKS_PLANS: ZeroLeaksPlan[] = [
  { name: 'Pro', monthly: 149, detail: 'Individual developers, 14-day trial of 10 scans' },
  { name: 'Team', monthly: 499, detail: '5 seats' },
  { name: 'Business', monthly: 1999, detail: '15 seats, SSO, SCIM, and audit logs' },
  { name: 'Enterprise', monthly: null, detail: 'Private-cloud deployment' },
]

export const ZEROLEAKS_PLAN_TERMS = 'Unlimited scans on every plan, two months free on yearly'

export function formatPlanPrice(plan: ZeroLeaksPlan): string {
  return plan.monthly === null ? 'Custom' : `$${plan.monthly.toLocaleString('en-US')}`
}
