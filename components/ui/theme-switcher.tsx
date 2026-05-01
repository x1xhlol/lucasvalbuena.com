'use client';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { Monitor, Moon, Sun } from 'lucide-react';
import { motion } from 'motion/react';
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
                        className="relative h-6 w-[30px] rounded-full transition-colors hover:text-foreground group"
                        key={key}
                        onClick={() => handleThemeClick(key as 'light' | 'dark' | 'system')}
                        type="button"
                    >
                        {isActive && (
                            <motion.div
                                className="absolute inset-0 rounded-full bg-muted"
                                layoutId="activeTheme"
                                transition={{ type: 'spring', duration: 0.5, bounce: 0.2 }}
                            />
                        )}
                        <Icon
                            className={cn(
                                'relative z-10 m-auto h-3.5 w-3.5 transition-colors',
                                isActive ? 'text-foreground font-bold' : 'text-muted-foreground group-hover:text-foreground'
                            )}
                        />
                    </button>
                );
            })}
        </div>
    );
};
