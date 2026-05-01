'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'

export function Stack() {
    const sectionRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-in')
                    }
                })
            },
            {
                threshold: 0.1,
                rootMargin: '0px 0px -100px 0px'
            }
        )

        const elements = sectionRef.current?.querySelectorAll('.animate-on-scroll')
        elements?.forEach((el) => observer.observe(el))

        return () => observer.disconnect()
    }, [])

    const techStack = [
        { name: "React", icon: "/icons/react_dark.svg", href: "https://react.dev" },
        { name: "Next.js", icon: "/icons/nextjs_icon_dark.svg", href: "https://nextjs.org" },
        { name: "TypeScript", icon: "/icons/typescript.svg", href: "https://www.typescriptlang.org" },
        { name: "Python", icon: "/icons/python.svg", href: "https://www.python.org" },
        { name: "AI", icon: "/icons/openai.svg", href: "https://openai.com" },
        { name: "Tailwind", icon: "/icons/tailwindcss.svg", href: "https://tailwindcss.com" },
        { name: "Convex", icon: "/icons/convex.svg", href: "https://www.convex.dev" },
        { name: "Vercel", icon: "/icons/vercel.svg", href: "https://vercel.com" },
        { name: "Bun", icon: "/icons/bun.svg", href: "https://bun.sh" },
    ]

    return (
        <section
            id="stack"
            data-nosnippet=""
            className="relative py-10 md:py-12"
            ref={sectionRef}
        >
            <div className="mx-auto max-w-5xl px-6 md:px-12">
                <div className="max-w-2xl mx-auto space-y-6 md:space-y-7">
                    <h2 className="text-sm md:text-base font-medium text-foreground animate-on-scroll">
                        Stack
                    </h2>

                    <div className="animate-on-scroll grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                        {techStack.map((tech) => (
                            <a
                                key={tech.name}
                                href={tech.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group inline-flex items-center gap-2.5 py-1"
                            >
                                <span className="relative h-4 w-4 shrink-0">
                                    <Image
                                        src={tech.icon}
                                        alt=""
                                        fill
                                        aria-hidden
                                        className="object-contain dark:invert"
                                    />
                                </span>
                                <span className="text-sm text-foreground/90 underline underline-offset-[5px] decoration-muted-foreground/30 group-hover:decoration-foreground transition-colors">
                                    {tech.name}
                                </span>
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
