"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import api from "@/lib/api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { usePermission } from "@/hooks/usePermission"
import { PageLoading } from "@/components/ui/design-system"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertModal } from "@/components/ui/alert-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, Plus } from "lucide-react"

type LeaveType = "CASUAL" | "SICK" | "EARNED" | "LOSS_OF_PAY"

type LeaveBalanceItem = {
	total: number | null
	used: number
	remaining: number | null
}

type LeaveBalanceResponse = Record<LeaveType, LeaveBalanceItem>

type LeaveHistoryItem = {
	id: string
	leaveType: string
	startDate: string
	endDate: string
	reason: string
	status: string
	appliedAt: string
}

const LEAVE_TYPE_OPTIONS: Array<{ label: string; value: LeaveType }> = [
	{ label: "Casual", value: "CASUAL" },
	{ label: "Sick", value: "SICK" },
	{ label: "Earned", value: "EARNED" },
	{ label: "Loss of Pay", value: "LOSS_OF_PAY" },
]

const EMPTY_BALANCE: LeaveBalanceResponse = {
	CASUAL: { total: 12, used: 0, remaining: 12 },
	SICK: { total: 7, used: 0, remaining: 7 },
	EARNED: { total: 12, used: 0, remaining: 12 },
	LOSS_OF_PAY: { total: null, used: 0, remaining: null },
}

const formatDate = (value: string) =>
	new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })

const getNextDate = (dateValue: string) => {
	if (!dateValue) return ""
	const date = new Date(dateValue)
	if (Number.isNaN(date.getTime())) return ""
	date.setDate(date.getDate() + 1)
	return date.toISOString().split("T")[0]
}

const getDays = (start: string, end: string) => {
	if (!start || !end) return 0
	const startDate = new Date(start)
	const endDate = new Date(end)
	startDate.setHours(0, 0, 0, 0)
	endDate.setHours(0, 0, 0, 0)
	if (endDate <= startDate) return 0
	const diff = endDate.getTime() - startDate.getTime()
	return Math.floor(diff / (1000 * 60 * 60 * 24))
}

const normalizeStatus = (status: string) => {
	if (status === "REJECTED") return "REJECTED"
	if (status === "AGENCY_APPROVED" || status === "APPROVED") return "APPROVED"
	return "PENDING"
}

const normalizeLeaveType = (leaveType: string): LeaveType => {
	const normalized = (leaveType || "").toUpperCase().trim()
	if (normalized === "ANNUAL") return "EARNED"
	if (normalized === "EMERGENCY") return "LOSS_OF_PAY"
	if (normalized === "CASUAL" || normalized === "SICK" || normalized === "EARNED" || normalized === "LOSS_OF_PAY") {
		return normalized
	}
	return "LOSS_OF_PAY"
}

const computeBalanceFromHistory = (history: LeaveHistoryItem[]): LeaveBalanceResponse => {
	const limits = {
		CASUAL: 12,
		SICK: 7,
		EARNED: 12,
	}

	const approved = history.filter((item) => normalizeStatus(item.status) === "APPROVED")
	const usedByType = approved.reduce<Record<LeaveType, number>>(
		(acc, item) => {
			const type = normalizeLeaveType(item.leaveType)
			acc[type] += getDays(item.startDate, item.endDate)
			return acc
		},
		{ CASUAL: 0, SICK: 0, EARNED: 0, LOSS_OF_PAY: 0 },
	)

	return {
		CASUAL: {
			total: limits.CASUAL,
			used: usedByType.CASUAL,
			remaining: Math.max(0, limits.CASUAL - usedByType.CASUAL),
		},
		SICK: {
			total: limits.SICK,
			used: usedByType.SICK,
			remaining: Math.max(0, limits.SICK - usedByType.SICK),
		},
		EARNED: {
			total: limits.EARNED,
			used: usedByType.EARNED,
			remaining: Math.max(0, limits.EARNED - usedByType.EARNED),
		},
		LOSS_OF_PAY: {
			total: null,
			used: usedByType.LOSS_OF_PAY,
			remaining: null,
		},
	}
}

const safeGetJson = async (path: string) => {
	try {
		const response = await fetch(`/api${path}`, {
			method: "GET",
			credentials: "include",
			headers: { "Content-Type": "application/json" },
		})

		if (!response.ok) return null
		return await response.json()
	} catch {
		return null
	}
}

export default function StaffLeavesPage() {
	const { hasPermission, user } = usePermission()
	const router = useRouter()
	const { agencySlug } = useParams()
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
	const [leaveBalance, setLeaveBalance] = useState<LeaveBalanceResponse>(EMPTY_BALANCE)
	const [history, setHistory] = useState<LeaveHistoryItem[]>([])
	const [form, setForm] = useState({
		leaveType: "" as LeaveType | "",
		startDate: "",
		endDate: "",
		reason: "",
	})

	const currentAgencySlug = Array.isArray(agencySlug) ? agencySlug[0] : agencySlug
	const canApplyLeave = hasPermission("apply_leave")

	useEffect(() => {
		if (!canApplyLeave) {
			router.replace(`/${currentAgencySlug}/staff/my-schedule`)
			return
		}
		void loadData()
	}, [canApplyLeave, currentAgencySlug])

	const loadData = async () => {
		setLoading(true)
		try {
			const [balanceData, myLeavesData] = await Promise.all([
				safeGetJson("/leaves/balance"),
				safeGetJson("/leaves/my-leaves"),
			])

			if (balanceData && myLeavesData) {
				setLeaveBalance(balanceData)
				setHistory(myLeavesData)
				return
			}

			// Compatibility fallback if backend is still running old leaves routes.
			const legacyRes = await api.get("/leaves")
			const allHistory: LeaveHistoryItem[] = legacyRes.data || []
			const myHistory = user?.employeeId
				? allHistory.filter((item: any) => item?.employee?.id === user.employeeId || item?.employeeId === user.employeeId)
				: allHistory

			setHistory(myHistory)
			setLeaveBalance(computeBalanceFromHistory(myHistory))
		} catch (error: any) {
			toast.error(error?.response?.data?.message || "Failed to load leave details")
		} finally {
			setLoading(false)
		}
	}

	const today = useMemo(() => new Date().toISOString().split("T")[0], [])
	const daysRequested = useMemo(() => getDays(form.startDate, form.endDate), [form.startDate, form.endDate])
	const selectedBalance = form.leaveType ? leaveBalance[form.leaveType as LeaveType] : null
	const showNoBalanceWarning =
		Boolean(form.leaveType) &&
		form.leaveType !== "LOSS_OF_PAY" &&
		selectedBalance?.remaining !== null &&
		Number(selectedBalance?.remaining || 0) <= 0

	const submitDisabled =
		saving ||
		!form.leaveType ||
		!form.startDate ||
		!form.endDate ||
		!form.reason.trim() ||
		daysRequested <= 0

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (submitDisabled) return

		if (new Date(form.endDate) <= new Date(form.startDate)) {
			toast.error("End date must be after start date")
			return
		}

		setShowSubmitConfirm(true)
	}

	const confirmSubmit = async () => {
		setSaving(true)
		try {
			await api.post("/leaves", {
				leaveType: form.leaveType,
				startDate: form.startDate,
				endDate: form.endDate,
				reason: form.reason.trim(),
			})

			toast.success("Leave request submitted successfully")
			setShowSubmitConfirm(false)
			setIsModalOpen(false)
			setForm({ leaveType: "", startDate: "", endDate: "", reason: "" })
			await loadData()
		} catch (error: any) {
			const message = error?.response?.data?.message
			toast.error(Array.isArray(message) ? message.join(", ") : message || "Failed to submit leave request")
		} finally {
			setSaving(false)
		}
	}

	if (loading) return <PageLoading message="Loading leave center..." />
	if (!canApplyLeave) return <PageLoading message="Checking permissions..." />

	const balanceCards = [
		{ key: "CASUAL" as LeaveType, title: "Casual", cardClass: "bg-green-50 border-green-100", valueClass: "text-green-700" },
		{ key: "SICK" as LeaveType, title: "Sick", cardClass: "bg-blue-50 border-blue-100", valueClass: "text-blue-700" },
		{ key: "EARNED" as LeaveType, title: "Earned", cardClass: "bg-yellow-50 border-yellow-100", valueClass: "text-yellow-700" },
		{ key: "LOSS_OF_PAY" as LeaveType, title: "Loss of Pay", cardClass: "bg-rose-50 border-rose-100", valueClass: "text-rose-700" },
	]

	return (
		<div className="space-y-6 pb-10">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-black text-[#0f172a]">My Leaves</h1>
					<p className="text-sm text-[#64748b] mt-1">Apply and track your leave requests.</p>
				</div>

				<Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
					<DialogTrigger asChild>
						<Button className="bg-[#06b6d4] hover:bg-cyan-600 text-white rounded-lg">
							<Plus className="h-4 w-4 mr-2" />
							Apply Leave
						</Button>
					</DialogTrigger>
					<DialogContent className="sm:max-w-[640px] border-[0.5px] border-[#e2e8f0] rounded-xl">
						<DialogHeader>
							<DialogTitle className="text-[#0f172a]">Apply for Leave</DialogTitle>
							<DialogDescription>Fill details and submit your leave request.</DialogDescription>
						</DialogHeader>

						<form className="space-y-4" onSubmit={handleSubmit}>
							<div className="space-y-2">
								<label className="text-sm font-semibold text-[#0f172a]">Leave Type <span className="text-[#06b6d4]">*</span></label>
								<Select value={form.leaveType} onValueChange={(value: LeaveType) => setForm((prev) => ({ ...prev, leaveType: value }))}>
									<SelectTrigger className="border-[#e2e8f0] rounded-lg">
										<SelectValue placeholder="Select leave type" />
									</SelectTrigger>
									<SelectContent>
										{LEAVE_TYPE_OPTIONS.map((option) => (
											<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div className="space-y-2">
									<label className="text-sm font-semibold text-[#0f172a]">Start Date <span className="text-[#06b6d4]">*</span></label>
									<Input
										type="date"
										min={today}
										value={form.startDate}
										onChange={(e) =>
											setForm((prev) => ({
												...prev,
												startDate: e.target.value,
												endDate: prev.endDate && e.target.value >= prev.endDate ? "" : prev.endDate,
											}))
										}
										className="border-[#e2e8f0] rounded-lg"
										required
									/>
								</div>
								<div className="space-y-2">
									<label className="text-sm font-semibold text-[#0f172a]">End Date <span className="text-[#06b6d4]">*</span></label>
									<Input
										type="date"
										min={form.startDate ? getNextDate(form.startDate) : today}
										value={form.endDate}
										onChange={(e) => {
											if (form.startDate && e.target.value <= form.startDate) {
												toast.error("End date must be after start date")
												return
											}
											setForm((prev) => ({ ...prev, endDate: e.target.value }))
										}}
										className="border-[#e2e8f0] rounded-lg"
										required
									/>
								</div>
							</div>

							<div className="space-y-2">
								<label className="text-sm font-semibold text-[#0f172a]">Number of days</label>
								<Input value={daysRequested ? `${daysRequested}` : "0"} readOnly className="border-[#e2e8f0] rounded-lg bg-[#f8fafc] text-[#64748b]" />
							</div>

							<div className="space-y-2">
								<label className="text-sm font-semibold text-[#0f172a]">Reason <span className="text-[#06b6d4]">*</span></label>
								<Textarea
									value={form.reason}
									onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
									className="border-[#e2e8f0] rounded-lg min-h-[100px]"
									placeholder="Briefly explain your leave request"
									required
								/>
							</div>

							{form.leaveType && selectedBalance && (
								<div className="rounded-lg border-[0.5px] border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-sm text-[#64748b]">
									Remaining balance: <span className="font-semibold text-[#0f172a]">{selectedBalance.remaining === null ? "Unlimited" : `${selectedBalance.remaining} day(s)`}</span>
								</div>
							)}

							{showNoBalanceWarning && (
								<div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
									You have no balance left. This will be Loss of Pay.
								</div>
							)}

							<div className="flex justify-end gap-2 pt-2">
								<Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
								<Button type="submit" disabled={submitDisabled} className="bg-[#06b6d4] hover:bg-cyan-600 text-white">
									{saving ? "Submitting..." : "Submit Request"}
								</Button>
							</div>
						</form>
					</DialogContent>
				</Dialog>
			</div>

			<section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
				{balanceCards.map((card) => {
					const value = leaveBalance[card.key]
					return (
						<article key={card.key} className={cn("rounded-xl border-[0.5px] p-4", card.cardClass)}>
							<p className="text-sm font-semibold text-[#0f172a]">{card.title}</p>
							<p className={cn("text-2xl font-black mt-2", card.valueClass)}>
								{value.remaining === null ? "-" : value.remaining}
							</p>
							<p className="text-xs text-[#64748b] mt-1">Used: {value.used}</p>
						</article>
					)
				})}
			</section>

			<section className="rounded-xl border-[0.5px] border-[#e2e8f0] bg-white overflow-hidden">
				<div className="px-4 py-3 border-b border-[#e2e8f0]">
					<h2 className="text-base font-bold text-[#0f172a]">My leave history</h2>
				</div>

				{history.length === 0 ? (
					<div className="p-10 text-center text-sm text-[#64748b]">
						<CalendarDays className="h-5 w-5 mx-auto mb-2 text-slate-400" />
						No leave requests yet
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="min-w-full text-sm">
							<thead className="bg-[#f8fafc] text-[#64748b]">
								<tr>
									<th className="text-left px-4 py-3 font-semibold">Leave Type</th>
									<th className="text-left px-4 py-3 font-semibold">From</th>
									<th className="text-left px-4 py-3 font-semibold">To</th>
									<th className="text-left px-4 py-3 font-semibold">Days</th>
									<th className="text-left px-4 py-3 font-semibold">Reason</th>
									<th className="text-left px-4 py-3 font-semibold">Status</th>
									<th className="text-left px-4 py-3 font-semibold">Applied On</th>
								</tr>
							</thead>
							<tbody>
								{history.map((item) => {
									const normalizedStatus = normalizeStatus(item.status)
									const badgeClass =
										normalizedStatus === "APPROVED"
											? "bg-green-50 text-green-700 border-green-200"
											: normalizedStatus === "REJECTED"
												? "bg-rose-50 text-rose-700 border-rose-200"
												: "bg-amber-50 text-amber-700 border-amber-200"

									return (
										<tr key={item.id} className="border-t border-[#e2e8f0]">
											<td className="px-4 py-3 font-medium text-[#0f172a]">{item.leaveType.replaceAll("_", " ")}</td>
											<td className="px-4 py-3 text-[#0f172a]">{formatDate(item.startDate)}</td>
											<td className="px-4 py-3 text-[#0f172a]">{formatDate(item.endDate)}</td>
											<td className="px-4 py-3 text-[#0f172a]">{getDays(item.startDate, item.endDate)}</td>
											<td className="px-4 py-3 text-[#64748b] max-w-[280px] truncate">{item.reason}</td>
											<td className="px-4 py-3">
												<Badge className={cn("border", badgeClass)}>{normalizedStatus}</Badge>
											</td>
											<td className="px-4 py-3 text-[#64748b]">{formatDate(item.appliedAt)}</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>
				)}
			</section>

			<AlertModal
				isOpen={showSubmitConfirm}
				onClose={() => setShowSubmitConfirm(false)}
				onConfirm={confirmSubmit}
				loading={saving}
				title="Submit Leave Request?"
				description={`Submit ${form.leaveType ? form.leaveType.replaceAll("_", " ").toLowerCase() : "leave"} request from ${form.startDate || "-"} to ${form.endDate || "-"} (${daysRequested} day${daysRequested === 1 ? "" : "s"}).`}
				variant="primary"
				confirmText="Submit Request"
				cancelText="Cancel"
			/>
		</div>
	)
}
