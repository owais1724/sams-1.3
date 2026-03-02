/**
 * useDeleteConfirm — Generic delete modal state hook
 *
 * Eliminates the repeated pattern:
 *   const [deleteModal, setDeleteModal] = useState({ open: false, id: '', name: '' })
 *   const [isDeleting, setIsDeleting] = useState(false)
 *   const handleDelete = async () => { ... }
 *
 * Usage:
 *   const { deleteModal, openDelete, closeDelete, handleDelete, isDeleting } = useDeleteConfirm({
 *     endpoint: '/clients',
 *     onSuccess: refetch,
 *     successMessage: 'Client deleted'
 *   })
 */

import { useState, useCallback } from 'react'
import api from '@/lib/api'
import { toast } from 'sonner'

interface UseDeleteConfirmOptions {
    /** Backend API endpoint prefix, e.g. '/clients' → DELETE /clients/:id */
    endpoint: string
    /** Called after successful deletion */
    onSuccess: () => void
    /** Toast message on success */
    successMessage?: string
    /** Toast message on failure */
    errorMessage?: string
}

interface DeleteModal {
    open: boolean
    id: string
    name: string
}

export function useDeleteConfirm({
    endpoint,
    onSuccess,
    successMessage = 'Record deleted successfully',
    errorMessage = 'Failed to delete record',
}: UseDeleteConfirmOptions) {
    const [deleteModal, setDeleteModal] = useState<DeleteModal>({
        open: false, id: '', name: ''
    })
    const [isDeleting, setIsDeleting] = useState(false)

    const openDelete = useCallback((id: string, name: string) => {
        setDeleteModal({ open: true, id, name })
    }, [])

    const closeDelete = useCallback(() => {
        setDeleteModal(prev => ({ ...prev, open: false }))
    }, [])

    const handleDelete = useCallback(async () => {
        if (!deleteModal.id) return
        setIsDeleting(true)
        try {
            await api.delete(`${endpoint}/${deleteModal.id}`)
            toast.success(successMessage)
            setDeleteModal({ open: false, id: '', name: '' })
            onSuccess()
        } catch (error) {
            toast.error(errorMessage)
        } finally {
            setIsDeleting(false)
        }
    }, [deleteModal.id, endpoint, successMessage, errorMessage, onSuccess])

    return {
        deleteModal,
        openDelete,
        closeDelete,
        handleDelete,
        isDeleting,
    }
}
