/**
 * SAMS Design System — Shared UI Components
 *
 * This file is the single source of truth for all shared UI patterns.
 * To change a button, stat card, page header, table, empty state, or badge
 * across the ENTIRE app — just edit here.
 *
 * Usage examples:
 *   <PageHeader title="Client Portfolio" subtitle="Manage clients" action={<CreateButton .../>} />
 *   <CreateButton onClick={...} label="Create Client" icon={<Plus className="h-4 w-4" />} />
 *   <StatCard title="Total Clients" value={12} icon={<Users />} color="teal" />
 *   <DataTable columns={['Name', 'Status']} rows={...} />
 *   <EmptyState title="No clients yet" description="Add your first client" action={...} />
 *   <SectionLabel>Active Projects</SectionLabel>
 *   <StatusBadge status="ACTIVE" />
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Loader2 } from "lucide-react"

// ─────────────────────────────────────────────────────────────────────────────
// 1. PRIMARY ACTION BUTTON
//    The main CTA button used at the top of every page (Create Client, etc.)
//    Change the style here → updates everywhere automatically.
// ─────────────────────────────────────────────────────────────────────────────

interface CreateButtonProps {
    onClick?: () => void
    label: string
    icon?: React.ReactNode
    loading?: boolean
    disabled?: boolean
    type?: "button" | "submit" | "reset"
    className?: string
}

export function CreateButton({
    onClick,
    label,
    icon,
    loading = false,
    disabled = false,
    type = "button",
    className,
}: CreateButtonProps) {
    return (
        <Button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={cn(
                "h-12 w-full md:w-auto bg-primary hover:bg-primary/90",
                "shadow-xl shadow-primary/20 font-bold",
                "px-6 md:px-8 rounded-xl",
                "transition-all active:scale-[0.98]",
                "text-sm md:text-base",
                className
            )}
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                icon && <span className="flex-shrink-0">{icon}</span>
            )}
            {label}
        </Button>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ADMIN PRIMARY ACTION BUTTON
//    Blue variant for Admin Portal pages (Initialize Agency, etc.)
// ─────────────────────────────────────────────────────────────────────────────

interface AdminCreateButtonProps extends Omit<CreateButtonProps, 'className'> {
    className?: string
}

export function AdminCreateButton({
    onClick,
    label,
    icon,
    loading = false,
    disabled = false,
    type = "button",
    className,
}: AdminCreateButtonProps) {
    return (
        <Button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={cn(
                "h-12 md:h-14 w-full md:w-auto",
                "bg-blue-600 hover:bg-blue-700 text-white font-black",
                "rounded-2xl shadow-xl shadow-blue-200",
                "transition-all active:scale-[0.98]",
                "px-6 md:px-8 text-xs md:text-base",
                className
            )}
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                icon && <span className="flex-shrink-0">{icon}</span>
            )}
            {label}
        </Button>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PAGE HEADER
//    Responsive header with title, subtitle, and optional action button.
//    Used at the top of every list/management page.
// ─────────────────────────────────────────────────────────────────────────────

interface PageHeaderProps {
    title: string
    titleHighlight?: string   // Optional colored word in the title (e.g. "Portfolio")
    subtitle?: string
    action?: React.ReactNode  // Usually a <CreateButton> or <AdminCreateButton>
    className?: string
}

export function PageHeader({
    title,
    titleHighlight,
    subtitle,
    action,
    className,
}: PageHeaderProps) {
    return (
        <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-6", className)}>
            <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 tracking-tight truncate">
                    {title}{" "}
                    {titleHighlight && (
                        <span className="text-primary">{titleHighlight}</span>
                    )}
                </h1>
                {subtitle && (
                    <p className="text-[10px] md:text-sm text-slate-500 font-medium mt-1 truncate">
                        {subtitle}
                    </p>
                )}
            </div>
            {action && <div className="w-full md:w-auto flex-shrink-0">{action}</div>}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. STAT CARD
//    The metric/KPI cards shown on dashboards and list pages.
// ─────────────────────────────────────────────────────────────────────────────

type StatCardColor = "teal" | "blue" | "emerald" | "amber" | "rose" | "slate" | "orange" | "violet"

const statCardColorMap: Record<StatCardColor, { icon: string; value: string; badge: string }> = {
    teal: { icon: "bg-teal-50 text-teal-600", value: "text-teal-700", badge: "bg-teal-50 text-teal-600 border-teal-100" },
    blue: { icon: "bg-blue-50 text-blue-600", value: "text-blue-700", badge: "bg-blue-50 text-blue-600 border-blue-100" },
    emerald: { icon: "bg-emerald-50 text-emerald-600", value: "text-emerald-700", badge: "bg-emerald-50 text-emerald-600 border-emerald-100" },
    amber: { icon: "bg-amber-50 text-amber-600", value: "text-amber-700", badge: "bg-amber-50 text-amber-600 border-amber-100" },
    rose: { icon: "bg-rose-50 text-rose-600", value: "text-rose-700", badge: "bg-rose-50 text-rose-600 border-rose-100" },
    slate: { icon: "bg-slate-100 text-slate-600", value: "text-slate-700", badge: "bg-slate-50 text-slate-600 border-slate-100" },
    orange: { icon: "bg-orange-50 text-orange-600", value: "text-orange-700", badge: "bg-orange-50 text-orange-600 border-orange-100" },
    violet: { icon: "bg-violet-50 text-violet-600", value: "text-violet-700", badge: "bg-violet-50 text-violet-600 border-violet-100" },
}

interface StatCardProps {
    title: string
    value: string | number
    icon: React.ReactNode
    color?: StatCardColor
    trend?: string
    className?: string
}

export function StatCard({ title, value, icon, color = "teal", trend, className }: StatCardProps) {
    const colors = statCardColorMap[color]
    return (
        <Card className={cn("rounded-[32px] border-slate-100 shadow-xl shadow-slate-200/50 p-6 flex items-center justify-between", className)}>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
                <h3 className={cn("text-3xl font-black mt-1", colors.value)}>{value}</h3>
                {trend && <p className="text-[10px] font-medium text-slate-400 mt-1">{trend}</p>}
            </div>
            <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center", colors.icon)}>
                {icon}
            </div>
        </Card>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. DATA TABLE WRAPPER
//    Responsive scrollable container for all tables (prevents page-level scroll).
// ─────────────────────────────────────────────────────────────────────────────

interface DataTableProps {
    columns: string[]
    children: React.ReactNode     // <TableRow> children for the body
    loading?: boolean
    loadingRows?: number
    className?: string
}

export function DataTable({ columns, children, loading = false, loadingRows = 5, className }: DataTableProps) {
    return (
        <div className={cn("overflow-x-auto rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50 bg-white", className)}>
            <Table>
                <TableHeader>
                    <TableRow className="border-slate-100">
                        {columns.map((col) => (
                            <TableHead
                                key={col}
                                className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap"
                            >
                                {col}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading
                        ? Array.from({ length: loadingRows }).map((_, i) => (
                            <TableRow key={i}>
                                {columns.map((col) => (
                                    <TableCell key={col}>
                                        <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                        : children}
                </TableBody>
            </Table>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. EMPTY STATE
//    Shown when a list/table has no data.
// ─────────────────────────────────────────────────────────────────────────────

interface EmptyStateProps {
    title: string
    description?: string
    icon?: React.ReactNode
    action?: React.ReactNode
    className?: string
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center text-center",
            "py-20 px-6 rounded-[32px]",
            "bg-slate-50 border-2 border-dashed border-slate-200",
            className
        )}>
            {icon && (
                <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center shadow-lg border border-slate-100 mb-6 text-slate-300">
                    {icon}
                </div>
            )}
            <h4 className="text-lg font-bold text-slate-800">{title}</h4>
            {description && (
                <p className="text-sm text-slate-500 font-medium max-w-xs mt-2">{description}</p>
            )}
            {action && <div className="mt-8">{action}</div>}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. SECTION LABEL
//    Small uppercase labels used as section headings and field labels.
// ─────────────────────────────────────────────────────────────────────────────

interface SectionLabelProps {
    children: React.ReactNode
    className?: string
}

export function SectionLabel({ children, className }: SectionLabelProps) {
    return (
        <p className={cn("text-[10px] font-black text-slate-400 uppercase tracking-widest", className)}>
            {children}
        </p>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. STATUS BADGE
//    Consistent status pills for ACTIVE, INACTIVE, PENDING, APPROVED, etc.
// ─────────────────────────────────────────────────────────────────────────────

const statusBadgeVariants: Record<string, string> = {
    ACTIVE: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    INACTIVE: "bg-slate-100 text-slate-600 border border-slate-200",
    PENDING: "bg-amber-50 text-amber-700 border border-amber-100",
    PENDING_AGENCY: "bg-amber-50 text-amber-700 border border-amber-100",
    APPROVED: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    AGENCY_APPROVED: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    REJECTED: "bg-rose-50 text-rose-700 border border-rose-100",
    PRESENT: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    LATE: "bg-amber-50 text-amber-700 border border-amber-100",
    ABSENT: "bg-rose-50 text-rose-700 border border-rose-100",
    PAID: "bg-blue-50 text-blue-700 border border-blue-100",
    UNPAID: "bg-rose-50 text-rose-700 border border-rose-100",
    INFO: "bg-blue-50 text-blue-700 border border-blue-100",
    WARNING: "bg-amber-50 text-amber-700 border border-amber-100",
    ERROR: "bg-rose-50 text-rose-700 border border-rose-100",
    CRITICAL: "bg-rose-50 text-rose-700 border border-rose-100",
}

interface StatusBadgeProps {
    status: string
    className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const styles = statusBadgeVariants[status.toUpperCase()] || statusBadgeVariants.INACTIVE
    const label = status.replace(/_/g, " ")
    return (
        <span className={cn(
            "inline-flex items-center px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wide whitespace-nowrap shadow-none",
            styles,
            className
        )}>
            {label}
        </span>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. PAGE CARD (Content wrapper)
//    The standard white rounded card used to wrap page content sections.
// ─────────────────────────────────────────────────────────────────────────────

interface PageCardProps {
    children: React.ReactNode
    className?: string
    title?: string
    titleIcon?: React.ReactNode
}

export function PageCard({ children, className, title, titleIcon }: PageCardProps) {
    return (
        <Card className={cn("border-none shadow-xl shadow-slate-200/50 rounded-[32px] overflow-hidden", className)}>
            {title && (
                <CardHeader className="bg-slate-50/80 px-8 py-5 border-b border-slate-100">
                    <CardTitle className="flex items-center gap-3 text-slate-800 font-black uppercase text-xs tracking-[0.2em]">
                        {titleIcon}
                        {title}
                    </CardTitle>
                </CardHeader>
            )}
            <CardContent className="p-6 md:p-8">
                {children}
            </CardContent>
        </Card>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. PAGE LOADING SPINNER
//     Shown while page data is being fetched.
// ─────────────────────────────────────────────────────────────────────────────

interface PageLoadingProps {
    message?: string
}

export function PageLoading({ message = "Loading..." }: PageLoadingProps) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
            <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">{message}</p>
        </div>
    )
}
