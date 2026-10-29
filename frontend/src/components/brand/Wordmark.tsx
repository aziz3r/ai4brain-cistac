"use client";

import React from "react";
import Link from "next/link";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 group ${className}`}>
      <span className="font-serif text-2xl font-bold tracking-tight text-ink">
        AI4BRAIN
      </span>
      {/* Hand-drawn style rising growth mark */}
      <svg
        width="22"
        height="18"
        viewBox="0 0 24 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-terracotta transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
      >
        <path
          d="M2 17C6 17 8 13 11 11C14 9 16 11 19 6C20 4.5 21 3 22 2"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 2H22V8"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}