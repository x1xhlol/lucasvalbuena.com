'use client'

import { useEffect, useRef } from 'react'

export function Skills() {
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

    const areas = [
        {
            title: 'AI security',
            description:
                'Finding and fixing prompt injection and system-prompt extraction in production LLM apps.',
        },
        {
            title: 'Reverse engineering',
            description:
                'Mapping how AI tools work under the hood: system prompts, agent loops, model routing.',
        },
        {
            title: 'Open source',
            description:
                'Building tools in public and maintaining them long after launch.',
        },
        {
            title: 'Web',
            description:
                'React, Next.js, and TypeScript for the things around it.',
        },
    ]

    return (
        <section
            id="skills"
            data-nosnippet=""
            className="relative py-10 md:py-12"
            ref={sectionRef}
        >
            <div className="mx-auto max-w-5xl px-6 md:px-12">
                <div className="max-w-2xl mx-auto space-y-6 md:space-y-7">
                    <h2 className="text-sm md:text-base font-medium text-foreground animate-on-scroll">
                        Focus
                    </h2>

                    <p className="animate-on-scroll text-[15px] md:text-base text-foreground/90 leading-relaxed max-w-xl">
                        A few things I keep coming back to.
                    </p>

                    <div className="flex flex-col gap-5 sm:gap-6">
                        {areas.map((area, index) => (
                            <div
                                key={area.title}
                                className="animate-on-scroll space-y-1"
                                style={{ transitionDelay: `${index * 60}ms` }}
                            >
                                <h3 className="text-sm font-medium text-foreground">
                                    {area.title}
                                </h3>
                                <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                                    {area.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
