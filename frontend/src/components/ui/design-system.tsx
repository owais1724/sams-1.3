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
 *   <ControlPanel count={12} totalLabel="Active Clients" search={...} filter={...} />
 *   <SectionHeading title="Core Protocol" icon={<Shield />} />
 *   <StatusBadge status="ACTIVE" />
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
            variant="primary"
            size="cta"
            className={className}
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
// 2. FORM & SUBMIT BUTTONS
//    The big chunky buttons at the bottom of forms (Save, Update, Register).
// ─────────────────────────────────────────────────────────────────────────────

interface SubmitButtonProps extends Omit<CreateButtonProps, 'className'> {
    className?: string
}

export function SubmitButton({
    label,
    loading = false,
    disabled = false,
    className,
}: SubmitButtonProps) {
    return (
        <Button type="submit" disabled={disabled || loading} variant="primary" size="cta" className={className}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Saving..." : label}
        </Button>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ADMIN PRIMARY ACTION BUTTON
//    Blue variant for Admin Portal pages (Initialize Agency, etc.)
// ─────────────────────────────────────────────────────────────────────────────

export function AdminCreateButton({
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
            variant="admin"
            size="cta"
            className={className}
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
// 4. PAGE HEADER
//    Responsive header with title, subtitle, and optional action button.
// ─────────────────────────────────────────────────────────────────────────────

interface PageHeaderProps {
    title: string
    titleHighlight?: string   // Optional colored word in the title
    subtitle?: string
    action?: React.ReactNode  // Usually a <CreateButton> 
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
        <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 mb-8 sm:mb-12", className)}>
            <div className="flex-1 min-w-0">
                <h1 className="text-[28px] font-bold text-foreground leading-tight mb-2">
                    {title}{" "}
                    {titleHighlight && (
                        <span className="text-primary">{titleHighlight}</span>
                    )}
                </h1>
                {subtitle && (
                    <p className="text-[14px] text-muted-foreground mt-1 leading-relaxed max-w-2xl">
                        {subtitle}
                    </p>
                )}
            </div>
            {action && <div className="w-full sm:w-auto flex-shrink-0 animate-in fade-in slide-in-from-right-4 duration-500">{action}</div>}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. STAT CARD
//    KPI cards shown on dashboards and list pages.
// ─────────────────────────────────────────────────────────────────────────────

type StatCardColor = "teal" | "blue" | "emerald" | "amber" | "rose" | "slate" | "orange" | "violet"

const statCardColorMap: Record<StatCardColor, { icon: string; value: string; badge: string }> = {
    teal: { icon: "bg-teal-50 text-teal-700 border-teal-100", value: "text-slate-900", badge: "bg-teal-50 text-teal-700 border-teal-100" },
    blue: { icon: "bg-sky-50 text-sky-700 border-sky-100", value: "text-slate-900", badge: "bg-sky-50 text-sky-700 border-sky-100" },
    emerald: { icon: "bg-emerald-50 text-emerald-700 border-emerald-100", value: "text-slate-900", badge: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    amber: { icon: "bg-amber-50 text-amber-700 border-amber-100", value: "text-slate-900", badge: "bg-amber-50 text-amber-700 border-amber-100" },
    rose: { icon: "bg-rose-50 text-rose-700 border-rose-100", value: "text-slate-900", badge: "bg-rose-50 text-rose-700 border-rose-100" },
    slate: { icon: "bg-slate-50 text-slate-700 border-slate-100", value: "text-slate-900", badge: "bg-slate-50 text-slate-700 border-slate-100" },
    orange: { icon: "bg-orange-50 text-orange-700 border-orange-100", value: "text-slate-900", badge: "bg-orange-50 text-orange-700 border-orange-100" },
    violet: { icon: "bg-violet-50 text-violet-700 border-violet-100", value: "text-slate-900", badge: "bg-violet-50 text-violet-700 border-violet-100" },
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
        <Card className={cn("p-6 flex items-center justify-between overflow-hidden relative border-l-4 border-l-[#0d9488]", className)}>
            <div>
                <p className="text-[14px] font-medium text-slate-500">{title}</p>
                <h3 className={cn("text-[36px] font-bold leading-none mt-2", colors.value)}>{value}</h3>
                {trend && (
                    <p className="text-[12px] font-semibold text-slate-500 mt-2">
                        {trend}
                    </p>
                )}
            </div>
            <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center border", colors.icon)}>
                {icon}
            </div>
        </Card>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. DATA TABLE & WRAPPER
//    The main data display component used in lists.
// ─────────────────────────────────────────────────────────────────────────────

interface DataTableProps {
    columns: string[]
    children: React.ReactNode
    className?: string
    minWidth?: string
}

export function DataTable({ columns, children, className, minWidth = "720px" }: DataTableProps) {
    return (
        <TableCardWrapper className={className} minWidth={minWidth}>
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        {columns.map((col, i) => (
                            <TableColHead
                                key={i}
                                align={i === columns.length - 1 ? "right" : "left"}
                                className={i === 0 ? "pl-4 sm:pl-6" : i === columns.length - 1 ? "pr-4 sm:pr-6" : ""}
                            >
                                {col}
                            </TableColHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {children}
                </TableBody>
            </Table>
        </TableCardWrapper>
    )
}

export function TableCardWrapper({
    children,
    className,
    minWidth = "700px",
}: {
    children: React.ReactNode
    className?: string
    minWidth?: string
}) {
    return (
        <div className={cn(
            "bg-white rounded-xl",
            "border border-border shadow-[0_1px_3px_rgba(0,0,0,0.1)] overflow-hidden",
            className
        )}>
            <div className="overflow-x-auto">
                <div style={{ minWidth }}>
                    {children}
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. TABLE COLUMN HEADER
// ─────────────────────────────────────────────────────────────────────────────

interface TableColHeadProps {
    children: React.ReactNode
    align?: "left" | "right" | "center"
    className?: string
}

export function TableColHead({ children, align = "left", className }: TableColHeadProps) {
    return (
        <TableHead className={cn(
            align === "right" && "text-right",
            align === "center" && "text-center",
            className
        )}>
            {children}
        </TableHead>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. TABLE ROW STATES (Loading / Empty)
// ─────────────────────────────────────────────────────────────────────────────

export function TableRowLoading({ colSpan, message = "Loading..." }: { colSpan: number, message?: string }) {
    return (
        <TableRow>
            <TableCell colSpan={colSpan} className="text-center py-16">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    <p className="text-[12px] font-semibold text-slate-500 animate-pulse">
                        {message}
                    </p>
                </div>
            </TableCell>
        </TableRow>
    )
}

export function TableRowEmpty({ colSpan, title, description, icon, action }: {
    colSpan: number,
    title: string,
    description?: string,
    icon?: React.ReactNode,
    action?: React.ReactNode
}) {
    return (
        <TableRow>
            <TableCell colSpan={colSpan} className="py-20 text-center px-6 border-none">
                <EmptyState
                    title={title}
                    description={description}
                    icon={icon}
                    action={action}
                    className="border-none shadow-none bg-transparent py-0"
                />
            </TableCell>
        </TableRow>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. EMPTY STATE (Standalone)
//    Used when a whole page or section has no data.
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
            "flex flex-col items-center justify-center py-12 px-6 text-center bg-card rounded-xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.1)]",
            className
        )}>
            {icon && (
                <div className="h-14 w-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-primary mb-4 shrink-0">
                    <span className="scale-110">{icon}</span>
                </div>
            )}
            <h3 className="text-[20px] font-semibold text-foreground mb-1">{title}</h3>
            {description && (
                <p className="text-[14px] text-muted-foreground max-w-sm mx-auto mb-6 leading-relaxed">
                    {description}
                </p>
            )}
            {action && <div className="mt-2 shrink-0">{action}</div>}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. STATUS BADGE
// ─────────────────────────────────────────────────────────────────────────────

interface StatusBadgeProps {
    status: string
    className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const statusLabel = status.toUpperCase()
    const variantMap: Record<string, React.ComponentProps<typeof Badge>["variant"]> = {
        ACTIVE: "success",
        PRESENT: "success",
        SUCCESS: "success",

        CANCELLED: "destructive",
        CANCELED: "destructive",
        ABSENT: "destructive",
        FAILED: "destructive",
        REJECTED: "destructive",

        PLANNED: "inactive",
        CLOSED: "inactive",
        INACTIVE: "inactive",

        LATE: "warning",
        PENDING: "warning",
        WARNING: "warning",
    }
    const variant = variantMap[statusLabel] ?? "inactive"
    return (
        <Badge variant={variant} className={className}>
            {status.replace(/_/g, " ")}
        </Badge>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. SIDEBAR COMPONENTS (Unified Architecture)
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link"
import { LogOut } from "lucide-react"

interface SidebarItemProps {
    name: string
    href: string
    icon: any
    isActive: boolean
    className?: string
    onClick?: () => void
    collapsed?: boolean
}

export function SidebarItem({ name, href, icon: Icon, isActive, className, onClick, collapsed }: SidebarItemProps) {
    return (
        <Link
            href={href}
            onClick={onClick}
            title={collapsed ? name : undefined}
            className={cn(
                "group flex items-center rounded-lg px-4 py-3 text-[14px] font-medium transition-colors duration-200 relative select-none",
                collapsed && "justify-center px-3",
                isActive
                    ? "bg-[rgba(13,148,136,0.14)] text-[#0d9488]"
                    : "text-[var(--sidebar-foreground)] hover:text-white hover:bg-white/5",
                className
            )}
        >
            <Icon className={cn(
                "h-5 w-5 shrink-0",
                !collapsed && "mr-3",
                isActive ? "text-[#0d9488]" : "text-[var(--sidebar-foreground)] group-hover:text-white"
            )} />
            <span className={cn(
                "whitespace-nowrap transition-all duration-300",
                collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
            )}>
                {name}
            </span>
            {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0d9488]" />
            )}
        </Link>
    )
}

export function SidebarLogout({ onClick, label = "Sign Out", className, collapsed }: { onClick: () => void, label?: string, className?: string, collapsed?: boolean }) {
    return (
        <button
            onClick={onClick}
            title={collapsed ? label : undefined}
            className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 px-3 py-3 text-xs font-black text-red-400 hover:bg-red-500 hover:text-white transition-all duration-300 group",
                className
            )}
        >
            <LogOut className="h-4 w-4 transform group-hover:-translate-x-1 transition-transform shrink-0" />
            <span className={cn(
                "whitespace-nowrap transition-all duration-300",
                collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
            )}>
                {label}
            </span>
        </button>
    )
}

export function SidebarSectionLabel({ children, collapsed, className }: { children: React.ReactNode, collapsed?: boolean, className?: string }) {
    return (
        <p className={cn(
            "px-4 text-[12px] font-semibold text-[var(--sidebar-foreground)] uppercase tracking-wider mb-3 transition-opacity duration-300",
            collapsed ? "opacity-0 h-0" : "opacity-100",
            className
        )}>
            {children}
        </p>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. ROW ACTION BUTTONS (Uniform Edit / Delete / View)
//     Used inside table rows to perform specific record actions.
// ─────────────────────────────────────────────────────────────────────────────

import { Edit3, Trash2, Eye } from "lucide-react"

interface RowButtonProps {
    onClick: () => void
    disabled?: boolean
    title?: string
    className?: string
    label?: string
}

export function RowEditButton({ onClick, disabled, label = "Edit", className }: RowButtonProps) {
    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "h-10 px-4 rounded-lg font-medium text-[#0d9488] hover:bg-teal-50",
                className
            )}
        >
            <Edit3 className="h-3.5 w-3.5 mr-2 group-hover/btn:translate-x-0.5 transition-transform" />
            {label}
        </Button>
    )
}

export function RowDeleteButton({ onClick, disabled, label = "Delete", className }: RowButtonProps) {
    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "h-10 px-4 rounded-lg font-medium text-[#dc2626] hover:bg-red-50",
                className
            )}
        >
            <Trash2 className="h-3.5 w-3.5 mr-2 group-hover/btn:scale-110 transition-transform" />
            {label}
        </Button>
    )
}

export function RowViewButton({ onClick, disabled, label = "View", className }: RowButtonProps) {
    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "h-10 px-4 rounded-lg font-medium text-slate-700 hover:bg-slate-100",
                className
            )}
        >
            <Eye className="h-3.5 w-3.5 mr-2 group-hover/btn:scale-110 transition-transform" />
            {label}
        </Button>
    )
}

// Deprecated: Use RowDeleteButton instead for uniformity
export function ConfirmDeleteButton({ onClick, disabled, className }: {
    onClick: () => void,
    disabled?: boolean,
    title?: string,
    className?: string
}) {
    return <RowDeleteButton onClick={onClick} disabled={disabled} className={className} label="" />
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. GHOST / TEXT ACTION BUTTONS
//     Small, high-contrast text actions (Quick Add, etc.)
// ─────────────────────────────────────────────────────────────────────────────

interface GhostActionProps {
    onClick?: () => void
    children: React.ReactNode
    className?: string
    size?: "sm" | "md"
}

export function GhostAction({ onClick, children, className, size = "md" }: GhostActionProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "font-black text-primary uppercase tracking-widest hover:bg-primary/5 rounded-lg transition-all active:scale-[0.98]",
                size === "sm" ? "px-2 py-1 text-[9px]" : "px-3 py-2 text-[10px]",
                className
            )}
        >
            {children}
        </button>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. FORM LAYOUT COMPONENTS
//     Reusable blocks for building multi-section forms like AgencyForm or EmployeeForm.
// ─────────────────────────────────────────────────────────────────────────────

export function FormCard({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <div className={cn(
            "space-y-6 rounded-[32px] border border-slate-100 p-6 sm:p-8 bg-white shadow-xl shadow-slate-200/50",
            className
        )}>
            {children}
        </div>
    )
}

export function FormHeader({ title, color = "blue" }: { title: string, color?: "blue" | "emerald" | "amber" | "rose" }) {
    const dotColors = {
        blue: "bg-primary",
        emerald: "bg-emerald-500",
        amber: "bg-amber-500",
        rose: "bg-rose-500"
    }
    return (
        <div className="flex items-center gap-3 mb-2">
            <div className={cn("h-2 w-2 rounded-full animate-pulse", dotColors[color])} />
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-slate-500">{title}</h3>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 14. PAGE LOADING SPINNER
// ─────────────────────────────────────────────────────────────────────────────

export function PageLoading({ message = "Loading System Data..." }: { message?: string }) {
    return (
        <div className="min-h-[60vh] w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 font-inter">
            <div className="space-y-8">
                <div className="space-y-3">
                    <Skeleton className="h-9 w-[260px] sm:w-[320px]" />
                    <Skeleton className="h-5 w-[340px] sm:w-[460px]" />
                </div>

                <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <Skeleton className="h-[108px] rounded-xl" />
                    <Skeleton className="h-[108px] rounded-xl" />
                    <Skeleton className="h-[108px] rounded-xl" />
                    <Skeleton className="h-[108px] rounded-xl" />
                </div>

                <div className="rounded-xl border border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1)] overflow-hidden">
                    <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between gap-4">
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-64" />
                        </div>
                        <Skeleton className="h-10 w-32 rounded-lg" />
                    </div>
                    <div className="p-4 sm:p-6 space-y-3">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>

                <p className="text-center text-[12px] font-medium text-slate-500">{message}</p>
            </div>
        </div>
    )
}
// ─────────────────────────────────────────────────────────────────────────────
// 15. SECTION HEADING
//     Uniform header for subsections within a page or dashboard.
// ─────────────────────────────────────────────────────────────────────────────
interface SectionHeadingProps {
    title: string
    icon?: React.ReactNode
    action?: React.ReactNode
    className?: string
}

export function SectionHeading({ title, icon, action, className }: SectionHeadingProps) {
    return (
        <div className={cn("flex items-center justify-between mb-8 px-2", className)}>
            <h2 className="text-[20px] font-semibold text-slate-900 flex items-center gap-3">
                {icon && <span className="text-primary">{icon}</span>}
                {title}
            </h2>
            {action && action}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 16. CONTROL PANEL (Search + Count)
//     Standardized bar shown above data tables for searching and record counting.
// ─────────────────────────────────────────────────────────────────────────────
interface ControlPanelProps {
    count: number
    totalLabel: string
    children?: React.ReactNode // Usually the SearchBar and Filters
    className?: string
}

export function ControlPanel({ count, totalLabel, children, className }: ControlPanelProps) {
    return (
        <div className={cn(
            "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-xl bg-white border border-border shadow-[0_1px_3px_rgba(0,0,0,0.1)] mb-6 sm:mb-8",
            className
        )}>
            <div className="flex items-center gap-3 sm:gap-4 px-1 sm:px-2">
                <div className="h-9 w-9 sm:h-10 sm:w-10 bg-primary/20 text-primary rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-xs sm:text-sm shadow-inner shadow-black/20">
                    {count}
                </div>
                <span className="text-[14px] font-medium text-slate-600">
                    {totalLabel}
                </span>
            </div>
            <div className="flex flex-1 items-center gap-2 max-w-2xl">
                {children}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 17. FORM GROUP LABELS
//     Standardized label style for form fields.
// ─────────────────────────────────────────────────────────────────────────────
export function FormLabelBase({ label, required, className }: { label: string, required?: boolean, className?: string }) {
    return (
        <label className={cn("text-[12px] font-semibold text-slate-600 uppercase tracking-wider mb-2 block", className)}>
            {label} {required && <span className="text-rose-500 font-bold ml-0.5">*</span>}
        </label>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 18. PREMIUM INPUT CLASSES
// ─────────────────────────────────────────────────────────────────────────────
export const inputVariants = "h-12 sm:h-14 bg-white border border-border text-slate-900 placeholder:text-slate-400 rounded-xl focus:bg-white focus:border-primary/40 focus:ring-primary/20 transition-all font-medium px-4 sm:px-5 text-sm sm:text-base selection:bg-primary/20"

export const selectVariants = "h-12 sm:h-14 bg-white border border-border text-slate-900 rounded-xl focus:bg-white focus:border-primary/40 focus:ring-primary/20 transition-all font-medium px-4 sm:px-5 w-full appearance-none text-sm sm:text-base selection:bg-primary/20"
