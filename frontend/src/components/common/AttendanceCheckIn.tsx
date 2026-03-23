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
import { Camera, MapPin, CheckCircle2, Loader2, X, AlertTriangle } from "lucide-react"
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
    const [step, setStep] = useState<'photo' | 'location' | 'submitting' | 'camera-error'>('photo')
    const [photoData, setPhotoData] = useState<string>("")
    const [location, setLocation] = useState<{ latitude: number, longitude: number } | null>(null)
    const [cameraError, setCameraError] = useState<string>("")
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)

    // Step 1: Start camera for photo
    const startCamera = async () => {
        try {
            setCameraError("")
            
            // Check if mediaDevices is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setCameraError("Camera is not supported on this device or browser.")
                setStep('camera-error')
                return
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'user', // Front camera for selfie
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            })
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                streamRef.current = stream
            }
        } catch (error: any) {
            console.error("Camera error:", error)
            
            let errorMessage = "Failed to access camera. "
            
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                errorMessage += "Camera permission was denied. Please allow camera access in your browser settings and try again."
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                errorMessage += "No camera found on this device."
            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                errorMessage += "Camera is already in use by another application."
            } else if (error.name === 'OverconstrainedError') {
                errorMessage += "Camera does not meet the required specifications."
            } else {
                errorMessage += "Please check your camera permissions and try again."
            }
            
            setCameraError(errorMessage)
            setStep('camera-error')
            toast.error(errorMessage)
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
                    console.error("Location error:", error)
                    let errorMsg = "Failed to get location. "
                    
                    if (error.code === error.PERMISSION_DENIED) {
                        errorMsg += "Location permission was denied."
                    } else if (error.code === error.POSITION_UNAVAILABLE) {
                        errorMsg += "Location information is unavailable."
                    } else if (error.code === error.TIMEOUT) {
                        errorMsg += "Location request timed out."
                    }
                    
                    toast.warning(errorMsg + " Submitting without location.")
                    // Still allow submission without location
                    submitAttendance(null)
                }
            )
        } else {
            toast.warning("Geolocation not supported. Submitting without location.")
            submitAttendance(null)
        }
    }

    // Step 4: Submit everything
    const submitAttendance = async (gpsLocation: { latitude: number, longitude: number } | null) => {
        setStep('submitting')
        
        try {
            const payload: any = {
                method: 'WEB',
                photo: photoData,
                latitude: gpsLocation?.latitude?.toString(),
                longitude: gpsLocation?.longitude?.toString()
            }

            // Always prioritize deploymentId if available
            if (deploymentId) {
                payload.deploymentId = deploymentId
            } else if (projectId) {
                payload.projectId = projectId
            } else {
                throw new Error("No deployment or project selected")
            }

            await api.post('/attendance/check-in', payload)
            
            toast.success("Attendance recorded successfully!")
            onSuccess()
            onOpenChange(false)
            resetFlow()
        } catch (error: any) {
            console.error("Check-in error:", error)
            const errorMessage = error.response?.data?.message || error.message || "Failed to record attendance"
            toast.error(errorMessage)
            setStep('photo')
        }
    }

    const resetFlow = () => {
        setStep('photo')
        setPhotoData("")
        setLocation(null)
        setCameraError("")
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
        }
    }

    const handleClose = () => {
        resetFlow()
        onOpenChange(false)
    }

    const retryCamera = () => {
        setCameraError("")
        setStep('photo')
        startCamera()
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

            {/* Camera Error Dialog */}
            <Dialog open={step === 'camera-error'} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-[450px] p-0">
                    <div className="p-8 text-center">
                        <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="h-8 w-8 text-red-500" />
                        </div>
                        <DialogTitle className="text-xl font-black mb-3">Camera Access Required</DialogTitle>
                        <DialogDescription className="text-sm text-slate-600 mb-6">
                            {cameraError}
                        </DialogDescription>
                        <div className="flex gap-3">
                            <Button
                                onClick={handleClose}
                                variant="outline"
                                className="flex-1 h-11 rounded-xl"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={retryCamera}
                                className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700"
                            >
                                Retry
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
