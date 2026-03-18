"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Building2, Shield, Users, Edit3, Power, PowerOff } from "lucide-react"
import { RowEditButton, RowDeleteButton, StatCard } from "@/components/ui/design-system"
import { cn } from "@/lib/utils"
import { FormModal } from "@/components/common/FormModal"
import { AgencyForm } from "@/components/admin/AgencyForm"
import { toast } from "@/components/ui/sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertModal } from "@/components/ui/alert-modal"
import { TableRowEmpty, TableRowLoading } from "@/components/ui/design-system"

export default function AdminDashboard() {
    const [agencies, setAgencies] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [editingAgency, setEditingAgency] = useState<any>(null)
    const [deleteModal, setDeleteModal] = useState<{ open: boolean, id: string, name: string }>({
        open: false,
        id: "",
        name: ""
    })
    const [isDeleting, setIsDeleting] = useState(false)
    const [toggleModal, setToggleModal] = useState<{ open: boolean, id: string, name: string, currentStatus: boolean }>({
        open: false, id: "", name: "", currentStatus: true
    })
    const [isToggling, setIsToggling] = useState(false)

    const fetchAgencies = async () => {
        try {
            const response = await api.get("/agencies")
            setAgencies(response.data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteModal.id) return
        setIsDeleting(true)
        try {
            await api.delete(`/agencies/${deleteModal.id}`)
            toast.success("Agency deleted successfully")
            setDeleteModal({ open: false, id: "", name: "" })
            fetchAgencies()
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete agency")
        } finally {
            setIsDeleting(false)
        }
    }

    const handleToggleStatus = async () => {
        if (!toggleModal.id) return
        setIsToggling(true)
        try {
            const res = await api.patch(`/agencies/${toggleModal.id}/toggle-status`)
            const newStatus = res.data.isActive
            setAgencies(prev => prev.map(a => a.id === toggleModal.id ? { ...a, isActive: newStatus } : a))
            toast.success(newStatus ? `${toggleModal.name} has been activated` : `${toggleModal.name} has been deactivated`)
            setToggleModal({ open: false, id: "", name: "", currentStatus: true })
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update agency status")
        } finally {
            setIsToggling(false)
        }
    }

    useEffect(() => {
        fetchAgencies()
    }, [])

    const stats = [
        { title: "Total Agencies", value: agencies.length.toString(), icon: Building2, color: "text-blue-600" },
        { title: "Active Deployments", value: agencies.filter(a => a.isActive).length.toString(), icon: Shield, color: "text-emerald-600" },
        { title: "Platform Health", value: "Optimal", icon: Users, color: "text-purple-600" },
    ]

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 font-inter">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">System Level: Authoritative</span>
                    </div>
                    <h1 className="text-[28px] font-bold text-slate-900 mb-2 truncate">Infrastructure Command</h1>
                    <p className="text-[14px] text-slate-500 truncate flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        Global Network Node Management
                    </p>
                </div>

                <FormModal
                    open={open}
                    onOpenChange={(val) => {
                        setOpen(val)
                        if (!val) setEditingAgency(null)
                    }}
                    title={editingAgency ? "Edit Agency" : "Create Agency"}
                    description={editingAgency
                        ? "Update agency details and access settings."
                        : "Provision a new agency portal and operational node."}
                    maxWidth={600}
                    trigger={
                        <Button
                            variant="primary"
                            size="cta"
                            onClick={() => {
                                setEditingAgency(null)
                                setOpen(true)
                            }}
                            className="w-full md:w-auto"
                        >
                            <Plus className="h-4 w-4" />
                            New Agency
                        </Button>
                    }
                >
                    <AgencyForm
                        initialData={editingAgency}
                        onSuccess={() => {
                            setOpen(false)
                            setEditingAgency(null)
                            fetchAgencies()
                        }}
                    />
                </FormModal>
            </div>

            {/* Stat Matrix */}
            <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
                {stats.map((stat) => (
                    <StatCard
                        key={stat.title}
                        title={stat.title}
                        value={stat.value}
                        icon={<stat.icon className="h-6 w-6" />}
                        color={stat.color.includes('blue') ? 'blue' : stat.color.includes('emerald') ? 'emerald' : 'violet'}
                        className="h-full"
                    />
                ))}
            </div>

            {/* Data Table */}
            <Card className="overflow-hidden">
                <div className="px-4 sm:px-6 py-5 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-[20px] font-semibold text-slate-900">Network Directory</h3>
                        <p className="text-[14px] text-slate-500 mt-1">Active infrastructure nodes and agency portals.</p>
                    </div>
                    <Badge variant="secondary">{agencies.length} total</Badge>
                </div>
                <div className="overflow-x-auto scrollbar-hide">
                    <Table className="min-w-[800px]">
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="pl-4 sm:pl-6">Agency</TableHead>
                                <TableHead>Portal</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right pr-4 sm:pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRowLoading colSpan={5} message="Loading agencies..." />
                            ) : agencies.length === 0 ? (
                                <TableRowEmpty
                                    colSpan={5}
                                    title="No agencies found"
                                    description="Create your first agency."
                                    icon={<Building2 className="h-6 w-6 text-[#06b6d4]" />}
                                />
                            ) : (
                                agencies.map((agency) => (
                                    <TableRow key={agency.id} className="group/row">
                                        <TableCell className="pl-4 sm:pl-6">
                                            <div className="flex flex-col gap-2">
                                                <span className="text-[14px] font-semibold text-slate-900">{agency.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[12px] text-slate-500">NODE_{agency.id.slice(-6).toUpperCase()}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                                <code className="text-[12px] font-medium text-[#06b6d4] bg-cyan-50 px-3 py-1 rounded-lg border border-cyan-100">
                                                    /{agency.slug}
                                                </code>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={agency.isActive ? "success" : "destructive"}>
                                                {agency.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-slate-600">
                                            {new Date(agency.createdAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </TableCell>
                                        <TableCell className="pr-4 sm:pr-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => setToggleModal({ open: true, id: agency.id, name: agency.name, currentStatus: agency.isActive })}
                                                >
                                                    {agency.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                                    {agency.isActive ? "Deactivate" : "Activate"}
                                                </Button>
                                                <RowEditButton label="Edit" onClick={() => { setEditingAgency(agency); setOpen(true) }} />
                                                <RowDeleteButton label="Delete" onClick={() => setDeleteModal({ open: true, id: agency.id, name: agency.name })} />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Modals styling similarly updated in their components */}
            <AlertModal
                isOpen={toggleModal.open}
                onClose={() => setToggleModal({ ...toggleModal, open: false })}
                onConfirm={handleToggleStatus}
                loading={isToggling}
                title={toggleModal.currentStatus ? "Deactivate agency" : "Activate agency"}
                variant={toggleModal.currentStatus ? "danger" : "success"}
                description={
                    toggleModal.currentStatus
                        ? `Deactivate ${toggleModal.name}? Users will not be able to access the portal until reactivated.`
                        : `Activate ${toggleModal.name}? Users will regain portal access immediately.`
                }
                confirmText={toggleModal.currentStatus ? "Deactivate" : "Activate"}
            />

            <AlertModal
                isOpen={deleteModal.open}
                onClose={() => setDeleteModal({ ...deleteModal, open: false })}
                onConfirm={handleDelete}
                loading={isDeleting}
                title="Delete agency"
                variant="danger"
                description={`Are you sure you want to delete ${deleteModal.name}? This action cannot be undone.`}
                confirmText="Delete"
            />
        </div>
    )
}
