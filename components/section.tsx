import { cn } from '@/lib/utils'

// Shared grid for every band on the home page. Above lg the heading sits in a
// left rail beside the content, which is where the centered column was leaving
// ~170px of dead margin; below lg it stacks above the content as before.
// Hero passes no label and gets the empty rail cell, so its text still lines up
// with every section under it.
export function Section({
  id,
  label,
  children,
  className,
  labelClassName,
}: {
  id: string
  label?: string
  children: React.ReactNode
  className?: string
  labelClassName?: string
}) {
  return (
    <section id={id} className={cn('relative py-7 md:py-8', className)}>
      <div className="mx-auto max-w-5xl px-6 md:px-12">
        <div className="relative z-10 mx-auto w-full max-w-2xl lg:grid lg:max-w-[53rem] lg:grid-cols-[7rem_1fr] lg:gap-x-12">
          {label ? (
            <h2
              className={cn(
                'mb-4 text-sm font-medium text-muted-foreground lg:mb-0 lg:text-right',
                labelClassName,
              )}
            >
              {label}
            </h2>
          ) : (
            <div aria-hidden />
          )}
          <div className="lg:max-w-2xl">{children}</div>
        </div>
      </div>
    </section>
  )
}
