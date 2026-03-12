"use client"

import { useState, useEffect, useRef } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { ScanLine, X, Camera, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface QRScannerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onScanSuccess: (decodedText: string, decodedResult: any) => void
    title?: string
    description?: string
}

export function QRScanner({
    open,
    onOpenChange,
    onScanSuccess,
    title = "Scan Site QR Code",
    description = "Position the QR code within the frame to check in"
}: QRScannerProps) {
    const [scanning, setScanning] = useState(false)
    const [error, setError] = useState<string>("")
    const [success, setSuccess] = useState(false)
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const qrReaderElementId = "qr-reader"

    useEffect(() => {
        if (open && !scannerRef.current) {
            // Wait for DOM to be ready before starting scanner
            const timer = setTimeout(() => {
                const element = document.getElementById(qrReaderElementId)
                if (element) {
                    startScanner()
                }
            }, 100)
            
            return () => clearTimeout(timer)
        }

        return () => {
            if (!open) {
                stopScanner()
            }
        }
    }, [open])

    const startScanner = async () => {
        try {
            // Ensure element exists
            const element = document.getElementById(qrReaderElementId)
            if (!element) {
                console.error("QR reader element not found")
                return
            }

            setError("")
            setScanning(true)

            const html5QrCode = new Html5Qrcode(qrReaderElementId)
            scannerRef.current = html5QrCode

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
            }

            await html5QrCode.start(
                { facingMode: "environment" }, // Use back camera on mobile
                config,
                (decodedText, decodedResult) => {
                    // Successfully scanned
                    setSuccess(true)
                    setScanning(false)
                    onScanSuccess(decodedText, decodedResult)
                    
                    // Close scanner after success
                    setTimeout(() => {
                        stopScanner()
                        onOpenChange(false)
                    }, 1000)
                },
                (errorMessage) => {
                    // Scanning error (can be ignored - happens when no QR in view)
                }
            )
        } catch (err: any) {
            console.error("Scanner error:", err)
            setError(
                err.message || "Failed to access camera. Please ensure camera permissions are granted."
            )
            setScanning(false)
        }
    }

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop()
                }
                scannerRef.current.clear()
                scannerRef.current = null
            } catch (err) {
                console.error("Error stopping scanner:", err)
            }
        }
        setScanning(false)
        setSuccess(false)
    }

    const handleClose = () => {
        stopScanner()
        onOpenChange(false)
        setError("")
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px] p-0">
                <div className="p-6 pb-4">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black font-outfit uppercase tracking-tight flex items-center gap-3">
                            <Camera className="h-6 w-6 text-emerald-500" />
                            {title}
                        </DialogTitle>
                        <DialogDescription className="font-bold text-slate-400 font-outfit text-xs uppercase tracking-widest mt-2">
                            {description}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="relative">
                    {/* Scanner Container */}
                    <div
                        id={qrReaderElementId}
                        className={cn(
                            "w-full overflow-hidden",
                            success && "opacity-50"
                        )}
                        style={{ minHeight: "300px" }}
                    />

                    {/* Scanning Overlay */}
                    {scanning && !success && !error && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="relative">
                                <div className="absolute inset-0 border-4 border-emerald-500 rounded-3xl animate-pulse" />
                                <ScanLine className="h-12 w-12 text-emerald-500 animate-bounce" />
                            </div>
                        </div>
                    )}

                    {/* Success State */}
                    {success && (
                        <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20 backdrop-blur-sm">
                            <div className="text-center">
                                <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto animate-scale-in" />
                                <p className="mt-4 text-lg font-black text-emerald-900 uppercase tracking-wide">
                                    QR Code Scanned!
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="absolute inset-0 flex items-center justify-center bg-rose-500/10 backdrop-blur-sm p-6">
                            <div className="text-center">
                                <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
                                <p className="mt-4 text-sm font-bold text-rose-900 max-w-xs">
                                    {error}
                                </p>
                                <Button
                                    onClick={() => {
                                        setError("")
                                        startScanner()
                                    }}
                                    className="mt-4 h-10 px-6 rounded-xl bg-rose-500 hover:bg-rose-600"
                                >
                                    Try Again
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 pt-4">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                            <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
                                <Camera className="h-4 w-4 text-white" />
                            </div>
                            <p className="text-[10px] font-bold text-blue-900 uppercase tracking-widest">
                                Position the site QR code in the camera view
                            </p>
                        </div>

                        <Button
                            onClick={handleClose}
                            variant="outline"
                            className="w-full h-12 rounded-xl border-2 border-slate-200 hover:bg-slate-50 font-black uppercase tracking-wide text-xs"
                        >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
