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
        <Button
            type="submit"
            disabled={disabled || loading}
            className={cn(
                "w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black shadow-lg shadow-slate-200/50 transition-all active:scale-[0.98] uppercase tracking-widest mt-4 shrink-0 text-xs sm:text-sm",
                className
            )}
        >
            {loading ? (
                <div className="flex items-center gap-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                </div>
            ) : (
                label
            )}
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
        <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 mb-6 sm:mb-8", className)}>
            <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                    {title}{" "}
                    {titleHighlight && (
                        <span className="text-primary">{titleHighlight}</span>
                    )}
                </h1>
                {subtitle && (
                    <p className="text-xs sm:text-sm md:text-base text-slate-500 font-medium mt-1.5 sm:mt-2 leading-relaxed max-w-2xl">
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
        <Card className={cn("rounded-2xl sm:rounded-[32px] border-slate-100 shadow-xl shadow-slate-200/50 p-4 sm:p-6 flex items-center justify-between", className)}>
            <div>
                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
                <h3 className={cn("text-2xl sm:text-3xl font-black mt-1", colors.value)}>{value}</h3>
                {trend && <p className="text-[10px] font-medium text-slate-400 mt-1">{trend}</p>}
            </div>
            <div className={cn("h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl flex items-center justify-center", colors.icon)}>
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
                    <TableRow className="border-b border-slate-50 hover:bg-transparent">
                        {columns.map((col, i) => (
                            <TableColHead
                                key={i}
                                align={i === columns.length - 1 ? "right" : "left"}
                                className={i === 0 ? "px-4 sm:px-8" : i === columns.length - 1 ? "px-4 sm:px-8" : ""}
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
            "bg-white rounded-[32px] md:rounded-[40px]",
            "border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden",
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
            "text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap py-4",
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
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
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
            "flex flex-col items-center justify-center py-24 px-6 text-center bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50",
            className
        )}>
            {icon && (
                <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 border border-slate-100 shadow-sm mb-8 group-hover:scale-110 transition-transform shrink-0">
                    <span className="scale-125">{icon}</span>
                </div>
            )}
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2 uppercase">{title}</h3>
            {description && (
                <p className="text-slate-500 font-medium max-w-sm mx-auto mb-10 text-sm leading-relaxed">
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
    const badgeStyles: Record<string, string> = {
        ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-100",
        INACTIVE: "bg-slate-100 text-slate-600 border-slate-200",
        PENDING: "bg-amber-50 text-amber-700 border-amber-100",
        APPROVED: "bg-blue-50 text-blue-700 border-blue-100",
        REJECTED: "bg-rose-50 text-rose-700 border-rose-100",
        LATE: "bg-orange-50 text-orange-700 border-orange-100",
    }
    const style = badgeStyles[statusLabel] || badgeStyles.INACTIVE
    return (
        <span className={cn(
            "inline-flex items-center px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wide border",
            style,
            className
        )}>
            {status.replace(/_/g, " ")}
        </span>
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
                "group flex items-center rounded-xl px-4 py-4 text-sm font-bold transition-all duration-300 relative overflow-hidden",
                collapsed && "justify-center px-3",
                isActive
                    ? "bg-primary text-white shadow-xl shadow-primary/20"
                    : "text-slate-300/60 hover:text-white hover:bg-white/5",
                className
            )}
        >
            <Icon className={cn(
                "h-5 w-5 transition-transform duration-300 group-hover:scale-110 shrink-0",
                !collapsed && "mr-3",
                isActive ? "text-white" : "text-slate-400/40 group-hover:text-white"
            )} />
            <span className={cn(
                "whitespace-nowrap transition-all duration-300",
                collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
            )}>
                {name}
            </span>
            {isActive && (
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-white rounded-l-full shadow-white/50" />
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

export function SidebarSectionLabel({ children, collapsed }: { children: React.ReactNode, collapsed?: boolean }) {
    return (
        <p className={cn(
            "px-3 mb-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] opacity-40 transition-all duration-300 whitespace-nowrap",
            collapsed && "opacity-0 h-0 mb-0 overflow-hidden"
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
                "h-10 px-5 rounded-xl font-bold text-slate-400 hover:text-primary hover:bg-primary/5 transition-all group/btn",
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
                "h-10 px-5 rounded-xl font-bold text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all group/btn",
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
                "h-10 px-5 rounded-xl font-bold text-slate-400 hover:text-primary hover:bg-primary/5 transition-all group/btn",
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
        blue: "bg-blue-600",
        emerald: "bg-emerald-600",
        amber: "bg-amber-600",
        rose: "bg-rose-600"
    }
    return (
        <div className="flex items-center gap-3 mb-2">
            <div className={cn("h-2 w-2 rounded-full animate-pulse", dotColors[color])} />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{title}</h3>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 14. PAGE LOADING SPINNER
// ─────────────────────────────────────────────────────────────────────────────

export function PageLoading({ message = "Loading System Data..." }: { message?: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
            <div className="relative">
                <div className="h-16 w-16 border-4 border-slate-100 rounded-full" />
                <div className="h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0" />
            </div>
            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] animate-pulse">
                {message}
            </p>
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
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
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
            "flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl sm:rounded-[32px] bg-white border border-slate-100 shadow-xl shadow-slate-200/50 mb-6 sm:mb-8",
            className
        )}>
            <div className="flex items-center gap-3 sm:gap-4 px-1 sm:px-2">
                <div className="h-9 w-9 sm:h-10 sm:w-10 bg-primary/10 text-primary rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-xs sm:text-sm">
                    {count}
                </div>
                <span className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-[0.15em] sm:tracking-[0.2em]">
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
        <label className={cn("text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-2 block", className)}>
            {label} {required && <span className="text-rose-500 font-bold ml-0.5">*</span>}
        </label>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 18. PREMIUM INPUT CLASSES
// ─────────────────────────────────────────────────────────────────────────────
export const inputVariants = "h-12 sm:h-14 bg-slate-50 border-transparent text-slate-900 placeholder:text-slate-300 rounded-xl sm:rounded-2xl focus:bg-white focus:border-primary/20 transition-all font-semibold italic px-4 sm:px-6 text-sm sm:text-base"

export const selectVariants = "h-12 sm:h-14 bg-slate-50 border-transparent text-slate-900 rounded-xl sm:rounded-2xl focus:bg-white focus:border-primary/20 transition-all font-semibold italic px-4 sm:px-6 w-full appearance-none text-sm sm:text-base"
