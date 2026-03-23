"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ToggleOption {
  value: string
  label: string
}

interface ToggleGroupProps {
  options: ToggleOption[]
  value: string
  onChange: (value: string) => void
  className?: string
}

/**
 * ToggleGroup - A modern toggle button component with smooth animations
 * 
 * Features:
 * - Minimum width of 120-140px per option
 * - Clear labels inside each toggle option
 * - Smooth sliding animation when switching
 * - Cyan (#06b6d4) for active state
 * - Grey (#94a3b8) for inactive state
 * 
 * Usage:
 * ```tsx
 * const [view, setView] = useState('shifts')
 * 
 * <ToggleGroup
 *   options={[
 *     { value: 'shifts', label: 'Shifts' },
 *     { value: 'templates', label: 'Shift Templates' }
 *   ]}
 *   value={view}
 *   onChange={setView}
 * />
 * ```
 */
export function ToggleGroup({ options, value, onChange, className }: ToggleGroupProps) {
  const activeIndex = options.findIndex(opt => opt.value === value)
  
  return (
    <div
      className={cn(
        "relative inline-flex items-center gap-0 p-1 rounded-xl bg-slate-100/80 border border-slate-200/60 shadow-sm",
        className
      )}
    >
      {/* Sliding background indicator */}
      <div
        className="absolute top-1 bottom-1 rounded-lg bg-[#06b6d4] shadow-lg shadow-cyan-500/25 transition-all duration-300 ease-out"
        style={{
          left: `${activeIndex * (100 / options.length)}%`,
          width: `calc(${100 / options.length}% - 0.5rem)`,
          marginLeft: '0.25rem',
        }}
      />
      
      {options.map((option) => {
        const isActive = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-10 px-6 py-2.5 min-w-[130px] rounded-lg font-semibold text-sm transition-all duration-300 ease-out whitespace-nowrap cursor-pointer",
              isActive
                ? "text-white"
                : "text-[#94a3b8] hover:text-slate-700"
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
