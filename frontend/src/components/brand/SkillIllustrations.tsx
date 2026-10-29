"use client";

import React from "react";

interface IconProps {
  className?: string;
  size?: number;
}

// Memory: A delicate spiral/retention loop keeping a center point
export function MemoryIcon({ className = "text-teal", size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M16 4C9.37 4 4 9.37 4 16C4 22.63 9.37 28 16 28C21.5 28 26.1 24.3 27.5 19.2C28.2 16.5 27.2 13.5 25 11.5C22.5 9.2 19 8.5 16 10C13 11.5 11.5 14.5 12 17.5C12.5 20.5 15 22.5 18 22"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="2" fill="currentColor" />
    </svg>
  );
}

// Focus: Concentric gentle circles with a central direct line
export function FocusIcon({ className = "text-teal", size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="16" cy="16" r="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 2V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 25V30" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="16" cy="16" r="1.5" fill="currentColor" />
    </svg>
  );
}

// Flexibility: Two undulating lines that shift rules
export function FlexibilityIcon({ className = "text-teal", size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M5 23C9 23 11 9 17 9C23 9 24 23 29 23"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M5 9C9 9 12 23 18 23C24 23 25 9 29 9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeDasharray="2 3"
      />
    </svg>
  );
}

// Speed: A sharp, crisp reaction vector with light wake marks
export function SpeedIcon({ className = "text-teal", size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M18 4L7 18H16L14 28L25 14H16L18 4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Reasoning: Geometric pattern unfolding in logical steps
export function ReasoningIcon({ className = "text-teal", size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="5" y="19" width="7" height="7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="13" y="12" width="7" height="7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="21" y="5" width="7" height="7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 22.5H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20 15.5H21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function SkillIcon({ skillKey, size = 32, className = "text-teal" }: { skillKey: string; size?: number; className?: string }) {
  switch (skillKey) {
    case "working_memory":
    case "memory":
      return <MemoryIcon size={size} className={className} />;
    case "inhibitory_control":
    case "selective_attention":
    case "focus":
      return <FocusIcon size={size} className={className} />;
    case "cognitive_flexibility":
    case "flexibility":
      return <FlexibilityIcon size={size} className={className} />;
    case "processing_speed":
    case "speed":
      return <SpeedIcon size={size} className={className} />;
    case "inductive_reasoning":
    case "reasoning":
      return <ReasoningIcon size={size} className={className} />;
    default:
      return <MemoryIcon size={size} className={className} />;
  }
}