import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'
import { Section } from '@/components/section'

export function Experience() {
  return (
    <Section id="experience" label="Experience">
      <article className="space-y-2">
        <div>
          <div className="flex items-center justify-between gap-6">
            <h3 className="flex min-w-0 items-center text-sm font-medium text-foreground">
              <a
                href="https://orchid.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
              >
                <span className="relative mr-2.5 size-5 shrink-0" aria-hidden>
                  <Image
                    src="/logos/orchid-ink.svg"
                    alt=""
                    fill
                    className="object-contain dark:hidden"
                  />
                  <Image
                    src="/logos/orchid-paper.svg"
                    alt=""
                    fill
                    className="hidden object-contain dark:block"
                  />
                </span>
                <span className="underline underline-offset-[5px] decoration-muted-foreground/65 transition-colors group-hover:decoration-foreground">
                  Orchid
                </span>
                <ArrowUpRight
                  className="ml-1.5 h-3.5 w-3.5 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden
                />
              </a>
            </h3>
            <p className="shrink-0 whitespace-nowrap text-sm text-muted-foreground">
              Jul 2026 — Present
            </p>
          </div>

          <p className="mt-2 text-sm text-foreground/90">
            AI Agent &amp; Product Intern{' '}
            <span className="text-muted-foreground">(YC P25, Remote)</span>
          </p>
        </div>

        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          I work on the agent&apos;s behavior and capabilities, plus onboarding
          and core product workflows.
        </p>
      </article>
    </Section>
  )
}
