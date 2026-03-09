/**
 * SearchBar — Reusable search input with icon
 *
 * Replace this repeated block on every list page:
 *   <div className="relative group flex-1 md:flex-initial">
 *     <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 ..." />
 *     <Input placeholder="..." className="pl-11 pr-4 py-6 bg-slate-50 ..." ... />
 *   </div>
 *
 * Usage:
 *   <SearchBar value={query} onChange={setQuery} placeholder="Find employee..." />
 */

"use client"

import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface SearchBarProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
}

export function SearchBar({ value, onChange, placeholder = "Search...", className }: SearchBarProps) {
    return (
        <div className={cn("relative group flex-1 md:flex-initial", className)}>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-primary transition-colors pointer-events-none" />
            <Input
                placeholder={placeholder}
                className="pl-11 pr-10 py-4 sm:py-6 bg-slate-50 border-transparent rounded-xl sm:rounded-2xl w-full md:w-[280px] focus:bg-white focus:ring-primary shadow-inner transition-all font-medium text-sm"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 transition-colors"
                >
                    <X className="h-3 w-3 text-slate-600" />
                </button>
            )}
        </div>
    )
}
