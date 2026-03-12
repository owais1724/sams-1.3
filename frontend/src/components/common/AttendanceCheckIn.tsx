"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Camera, MapPin, CheckCircle2, Loader2, X } from "lucide-react"
import { toast } from "@/components/ui/sonner"
import api from "@/lib/api"

interface AttendanceCheckInProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    projectId?: string
    deploymentId?: string
    projectName?: string
    projectLocation?: string
}

export function AttendanceCheckIn({ open, onOpenChange, onSuccess, projectId, deploymentId, projectName, projectLocation }: AttendanceCheckInProps) {
    const [step, setStep] = useState<'photo' | 'location' | 'submitting'>('photo')
    const [photoData, setPhotoData] = useState<string>("")
    const [location, setLocation] = useState<{ latitude: number, longitude: number } | null>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)

    // Step 1: Start camera for photo
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' }, // Front camera for selfie
                audio: false
            })
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                streamRef.current = stream
            }
        } catch (error) {
            toast.error("Failed to access camera. Please check permissions.")
        }
    }

    // Step 2: Capture photo and proceed to location
    const capturePhoto = async () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current
            const canvas = canvasRef.current
            
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            
            const ctx = canvas.getContext('2d')
            if (ctx) {
                ctx.drawImage(video, 0, 0)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
                setPhotoData(dataUrl)
                
                // Stop camera
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop())
                }
                
                // Move directly to location step
                setStep('location')
                captureLocation()
            }
        }
    }

    // Step 3: Capture GPS location
    const captureLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    })
                    // Auto-submit once we have everything
                    submitAttendance({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    })
                },
                (error) => {
                    toast.error("Failed to get location. Please enable GPS.")
                    // Still allow submission without location
                    submitAttendance(null)
                }
            )
        } else {
            toast.error("Geolocation not supported")
            submitAttendance(null)
        }
    }

    // Step 4: Submit everything
    const submitAttendance = async (gpsLocation: { latitude: number, longitude: number } | null) => {
        setStep('submitting')
        
        try {
            await api.post('/attendance/check-in', {
                ...(deploymentId ? { deploymentId } : { projectId }),
                method: 'BIOMETRIC',
                photo: photoData,
                latitude: gpsLocation?.latitude,
                longitude: gpsLocation?.longitude
            })
            
            toast.success("Attendance recorded successfully!")
            onSuccess()
            onOpenChange(false)
            resetFlow()
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to record attendance")
            setStep('photo')
        }
    }

    const resetFlow = () => {
        setStep('photo')
        setPhotoData("")
        setLocation(null)
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
        }
    }

    const handleClose = () => {
        resetFlow()
        onOpenChange(false)
    }

    // Start camera when dialog opens
    useEffect(() => {
        if (open && step === 'photo') {
            startCamera()
        }
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop())
            }
        }
    }, [open, step])

    return (
        <>
            {/* Photo Capture Dialog */}
            <Dialog open={open && step === 'photo'} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-[500px] p-0">
                    <div className="p-6 pb-4">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black font-outfit uppercase tracking-tight flex items-center gap-3">
                                <Camera className="h-6 w-6 text-blue-500" />
                                Take Your Photo
                            </DialogTitle>
                            <DialogDescription className="font-bold text-slate-400 font-outfit text-xs uppercase tracking-widest mt-2">
                                Step 1 of 2: Capture attendance selfie
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="relative bg-black">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-[400px] object-cover"
                        />
                        <canvas ref={canvasRef} className="hidden" />
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                            <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
                                <Camera className="h-4 w-4 text-white" />
                            </div>
                            <p className="text-[10px] font-bold text-blue-900 uppercase tracking-widest">
                                Position your face in the frame and click capture
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                onClick={handleClose}
                                variant="outline"
                                className="flex-1 h-12 rounded-xl border-2"
                            >
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                            </Button>
                            <Button
                                onClick={capturePhoto}
                                className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700"
                            >
                                <Camera className="h-4 w-4 mr-2" />
                                Capture Photo
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Location & Submission */}
            <Dialog open={step === 'location' || step === 'submitting'} onOpenChange={() => {}}>
                <DialogContent className="sm:max-w-[400px] p-0">
                    <DialogHeader className="sr-only">
                        <DialogTitle>
                            {step === 'location' ? 'Getting Location' : 'Submitting Attendance'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-10 text-center">
                        {step === 'location' ? (
                            <>
                                <MapPin className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-pulse" />
                                <h3 className="text-xl font-black mb-2">Getting Your Location...</h3>
                                <p className="text-sm text-slate-500">Step 2 of 2: Capturing GPS coordinates</p>
                            </>
                        ) : (
                            <>
                                <Loader2 className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-spin" />
                                <h3 className="text-xl font-black mb-2">Submitting Attendance...</h3>
                                <p className="text-sm text-slate-500">Please wait</p>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
