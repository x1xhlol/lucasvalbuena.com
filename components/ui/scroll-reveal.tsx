"use client";

import React, { useRef, useMemo } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ScrollRevealProps {
  children: React.ReactNode;
  containerClassName?: string;
  textClassName?: string;
  enableBlur?: boolean;
  baseOpacity?: number;
  baseRotation?: number;
  blurStrength?: number;
  staggerDelay?: number;
  threshold?: number;
  duration?: number;
  springConfig?: {
    damping?: number;
    stiffness?: number;
    mass?: number;
  };
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  align?: "left" | "center" | "right";
  variant?: "default" | "muted" | "accent" | "primary";
}

const sizeClasses = {
  sm: "text-sm md:text-base",
  md: "text-base md:text-lg lg:text-xl",
  lg: "text-lg md:text-xl lg:text-2xl xl:text-3xl",
  xl: "text-xl md:text-2xl lg:text-3xl xl:text-4xl",
  "2xl": "text-2xl md:text-3xl lg:text-4xl xl:text-5xl",
};

const alignClasses = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const variantClasses = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  accent: "text-accent-foreground",
  primary: "text-primary",
};

export function ScrollReveal({
  children,
  containerClassName,
  textClassName,
  enableBlur = true,
  baseOpacity = 0.1,
  baseRotation = 3,
  blurStrength = 4,
  staggerDelay = 0.05,
  threshold = 0.5,
  duration = 0.8,
  springConfig = {
    damping: 25,
    stiffness: 100,
    mass: 1,
  },
  size = "lg",
  align = "left",
  variant = "default",
}: ScrollRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, {
    amount: threshold,
    once: true
  });

  const splitText = useMemo(() => {
    const text = typeof children === "string" ? children : "";
    return text.split(/(\s+)/).map((part, index) => {
      return {
        value: part,
        isSpace: part.match(/^\s+$/) && part.length > 0,
        originalIndex: index,
      };
    }).filter(item => item.value.length > 0);
  }, [children]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1,
      },
    },
  };

  const wordVariants = {
    hidden: {
      opacity: baseOpacity,
      filter: enableBlur ? `blur(${blurStrength}px)` : "blur(0px)",
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        ...springConfig,
        duration,
      },
    },
  };

  return (
    <motion.div
      ref={containerRef}
      className={cn(
        "my-2",
        containerClassName
      )}
    >
      <motion.p
        className={cn(
          "leading-relaxed font-normal",
          sizeClasses[size],
          alignClasses[align],
          variantClasses[variant],
          textClassName
        )}
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
      >
        {splitText.map((item) => (
          item.isSpace ? (
            <span key={`space-${item.originalIndex}`}>{item.value}</span>
          ) : (
            <motion.span
              key={`word-${item.originalIndex}`}
              className="inline-block"
              variants={wordVariants}
            >
              {item.value}
            </motion.span>
          )
        ))}
      </motion.p>
    </motion.div>
  );
}

export default ScrollReveal;
