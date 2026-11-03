import { CompanyLogo } from '@/components/company-logo'
import { Section } from '@/components/section'
import { EXPERIENCE } from '@/lib/experience'

export function Experience() {
  return (
    <Section id="experience" label="Experience">
      <div className="space-y-4">
        {EXPERIENCE.map((item) => (
          <a
            key={item.company}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-0.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
          >
            <span className="min-w-0 text-base font-medium text-foreground">
              <CompanyLogo company={item.company} />
              <span className="underline-offset-[5px] decoration-muted-foreground/65 group-hover:underline">
                {item.company}
              </span>
              <span className="ml-2 hidden font-normal text-muted-foreground sm:inline">
                {item.role}
              </span>
            </span>
            <span className="shrink-0 whitespace-nowrap text-sm text-muted-foreground tabular-nums">
              {item.dates}
            </span>
            <span className="col-span-2 text-base text-muted-foreground sm:hidden">
              {item.role}
            </span>
          </a>
        ))}
      </div>
    </Section>
  )
}
