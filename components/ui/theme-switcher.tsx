'use client';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { Monitor, Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const themes = [
    {
        key: 'system',
        icon: Monitor,
        label: 'System',
    },
    {
        key: 'light',
        icon: Sun,
        label: 'Light theme',
    },
    {
        key: 'dark',
        icon: Moon,
        label: 'Dark theme',
    },
];

export type ThemeSwitcherProps = {
    value?: 'light' | 'dark' | 'system';
    onChange?: (theme: 'light' | 'dark' | 'system') => void;
    defaultValue?: 'light' | 'dark' | 'system';
    className?: string;
};

export const ThemeSwitcher = ({
    value,
    onChange,
    defaultValue = 'system',
    className,
}: ThemeSwitcherProps) => {
    const [theme, setTheme] = useControllableState({
        defaultProp: defaultValue,
        prop: value,
        onChange,
    });

    const [mounted, setMounted] = useState(false);

    const handleThemeClick = useCallback(
        (themeKey: 'light' | 'dark' | 'system') => {
            setTheme(themeKey);
        },
        [setTheme]
    );

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className={cn('h-8 w-[104px] rounded-full bg-background ring-1 ring-border', className)} />
        );
    }

    const activeIndex = Math.max(
        0,
        themes.findIndex(({ key }) => key === theme)
    );

    return (
        <div
            className={cn(
                'relative isolate flex h-8 rounded-full bg-background p-1 ring-1 ring-border',
                className
            )}
        >
            {themes.map(({ key, icon: Icon, label }) => {
                const isActive = theme === key;
                return (
                    <button
                        aria-label={label}
                        className="relative h-6 w-[30px] rounded-full transition-[color,transform] duration-150 active:scale-95 hover:text-foreground group outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
                        key={key}
                        onClick={() => handleThemeClick(key as 'light' | 'dark' | 'system')}
                        type="button"
                    >
                        {isActive && (
                            <motion.div
                                className="absolute inset-0 rounded-full bg-muted"
                                layoutId="activeTheme"
                                transition={{ type: 'spring', duration: 0.25, bounce: 0 }}
                            />
                        )}
                        <Icon className="relative z-10 m-auto h-3.5 w-3.5 transition-colors text-muted-foreground group-hover:text-foreground" />
                    </button>
                );
            })}
            {/* Foreground-colored copy of the icon row, clipped to the active segment so
                the icon color slides with the pill instead of swapping */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-10 flex p-1 transition-[clip-path] duration-[250ms] motion-reduce:transition-none"
                style={{
                    clipPath: `inset(4px ${4 + (2 - activeIndex) * 30}px 4px ${4 + activeIndex * 30}px round 9999px)`,
                    transitionTimingFunction: 'var(--ease-out)',
                }}
            >
                {themes.map(({ key, icon: Icon }) => (
                    <span
                        key={key}
                        className="flex h-6 w-[30px] items-center justify-center text-foreground"
                    >
                        <Icon className="h-3.5 w-3.5" />
                    </span>
                ))}
            </div>
        </div>
    );
};
