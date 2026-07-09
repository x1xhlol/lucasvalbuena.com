const areas = [
    {
        title: 'AI security',
        description:
            'I find prompt injection and system-prompt extraction issues in LLM apps and help fix them.',
    },
    {
        title: 'Reverse engineering',
        description:
            'I take apart AI tools to see what they send to the model: system prompts, agent loops, routing.',
    },
    {
        title: 'Open source',
        description:
            'Most of what I build is open source, and I keep maintaining it after release.',
    },
    {
        title: 'Web',
        description:
            'React, Next.js, and TypeScript. This site and most of my projects are built with them.',
    },
]

export function Skills() {
    return (
        <section
            id="skills"
            data-nosnippet=""
            className="relative py-10 md:py-12"
        >
            <div className="mx-auto max-w-5xl px-6 md:px-12">
                <div className="max-w-2xl mx-auto space-y-6 md:space-y-7">
                    <h2 className="text-sm md:text-base font-medium text-foreground">
                        Focus
                    </h2>

                    <p className="text-[15px] md:text-base text-foreground/90 leading-relaxed max-w-xl">
                        A few things I keep coming back to.
                    </p>

                    <div className="flex flex-col gap-5 sm:gap-6">
                        {areas.map((area) => (
                            <div key={area.title} className="space-y-1">
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
