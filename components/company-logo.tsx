import Image from 'next/image'
import type { ExperienceItem } from '@/lib/experience'

// ZeroLeaks brand mark (rounded square with a circular cutout), inlined with
// currentColor so a single asset adapts to both themes
const ZeroLeaksIcon = () => (
  <svg
    viewBox="0 0 16 16"
    fill="currentColor"
    className="absolute inset-0 h-full w-full"
    aria-hidden
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M14 0C15.1046 0 16 0.895431 16 2V14C16 15.1046 15.1046 16 14 16H2C0.895431 16 0 15.1046 0 14V2C0 0.895431 0.895431 0 2 0H14ZM8 5.3125C6.51573 5.3125 5.3125 6.51573 5.3125 8C5.3125 9.48427 6.51573 10.6875 8 10.6875C9.48427 10.6875 10.6875 9.48427 10.6875 8C10.6875 6.51573 9.48427 5.3125 8 5.3125Z"
    />
  </svg>
)

// A 16px mark. By default it sits inline on the text baseline, as in the
// home page's Experience list; the Ask card places it in its own column.
export function CompanyLogo({
  company,
  className = 'relative mr-2 inline-block size-4 align-[-0.2em]',
}: {
  company: ExperienceItem['company']
  className?: string
}) {
  return (
    <span className={className} aria-hidden>
      {company === 'ZeroLeaks' ? (
        <ZeroLeaksIcon />
      ) : (
        <>
          <Image
            src="/logos/orchid-ink.svg"
            alt=""
            fill
            loading="eager"
            className="object-contain dark:hidden"
          />
          <Image
            src="/logos/orchid-paper.svg"
            alt=""
            fill
            loading="eager"
            className="hidden object-contain dark:block"
          />
        </>
      )}
    </span>
  )
}
