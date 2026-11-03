import { cn } from '@/lib/utils'

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
