import { cn } from '@/lib/utils'

// Every band on the home page shares one narrow reading column. Headings sit
// inline above their content in the same column, so the whole page reads as a
// single left-aligned stream. Hero passes no label and simply starts the flow.
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
      <div className="mx-auto w-full max-w-[38rem] px-6 md:relative md:-left-2.5">
        {label ? (
          <h2 className={cn('mb-4 text-base font-medium text-foreground', labelClassName)}>
            {label}
          </h2>
        ) : null}
        {children}
      </div>
    </section>
  )
}
