"use client"

import { useState, useRef, useEffect } from "react"
import { Camera, CheckCircle2, RotateCcw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

interface PhotoCaptureProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onPhotoCapture: (photoDataUrl: string) => void
    title?: string
    description?: string
}

export function PhotoCapture({
    open,
    onOpenChange,
    onPhotoCapture,
    title = "Take Your Photo",
    description = "Capture your photo for attendance verification"
}: PhotoCaptureProps) {
    const [capturedPhoto, setCapturedPhoto] = useState<string>("")
    const [streaming, setStreaming] = useState(false)
    const [error, setError] = useState("")
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)

    useEffect(() => {
        if (open) {
            startCamera()
        }

        return () => {
            stopCamera()
        }
    }, [open])

    const startCamera = async () => {
        try {
            setError("")
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "user", // Front camera for selfie
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            })

            if (videoRef.current) {
                videoRef.current.srcObject = stream
                streamRef.current = stream
                setStreaming(true)
            }
        } catch (err: any) {
            console.error("Camera error:", err)
            setError("Failed to access camera. Please ensure camera permissions are granted.")
        }
    }

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }
        setStreaming(false)
    }

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current
            const canvas = canvasRef.current

            canvas.width = video.videoWidth
            canvas.height = video.videoHeight

            const ctx = canvas.getContext('2d')
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8)
                setCapturedPhoto(photoDataUrl)
                stopCamera()
            }
        }
    }

    const retakePhoto = () => {
        setCapturedPhoto("")
        startCamera()
    }

    const confirmPhoto = () => {
        onPhotoCapture(capturedPhoto)
        onOpenChange(false)
        setCapturedPhoto("")
    }

    const handleClose = () => {
        stopCamera()
        setCapturedPhoto("")
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px] p-0">
                <div className="p-6 pb-4">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black font-outfit uppercase tracking-tight flex items-center gap-3">
                            <Camera className="h-6 w-6 text-blue-500" />
                            {title}
                        </DialogTitle>
                        <DialogDescription className="font-bold text-slate-400 font-outfit text-xs uppercase tracking-widest mt-2">
                            {description}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="relative bg-slate-900">
                    {!capturedPhoto ? (
                        <>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-[400px] object-cover"
                            />
                            <canvas ref={canvasRef} className="hidden" />
                            
                            {error && (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90">
                                    <div className="text-center p-6">
                                        <Camera className="h-12 w-12 text-rose-500 mx-auto mb-4" />
                                        <p className="text-sm font-bold text-rose-400 max-w-xs">
                                            {error}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="relative">
                            <img
                                src={capturedPhoto}
                                alt="Captured"
                                className="w-full h-[400px] object-cover"
                            />
                            <div className="absolute top-4 right-4 px-3 py-1 bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-full">
                                Photo Captured
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 pt-4">
                    {!capturedPhoto ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                                <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
                                    <Camera className="h-4 w-4 text-white" />
                                </div>
                                <p className="text-[10px] font-bold text-blue-900 uppercase tracking-widest">
                                    Position your face in the center and click capture
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    onClick={handleClose}
                                    variant="outline"
                                    className="flex-1 h-12 rounded-xl border-2 border-slate-200 hover:bg-slate-50 font-black uppercase tracking-wide text-xs"
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Cancel
                                </Button>
                                <Button
                                    onClick={capturePhoto}
                                    disabled={!streaming}
                                    className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wide text-xs shadow-lg shadow-blue-600/30"
                                >
                                    <Camera className="h-4 w-4 mr-2" />
                                    Capture Photo
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-3">
                            <Button
                                onClick={retakePhoto}
                                variant="outline"
                                className="flex-1 h-12 rounded-xl border-2 border-slate-200 hover:bg-slate-50 font-black uppercase tracking-wide text-xs"
                            >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Retake
                            </Button>
                            <Button
                                onClick={confirmPhoto}
                                className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wide text-xs shadow-lg shadow-emerald-600/30"
                            >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Continue
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
