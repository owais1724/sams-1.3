"use client"

import { useState } from "react"
import { QrCode, Download, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/sonner"

interface QRCodeDisplayProps {
    project: any
}

export function QRCodeDisplay({ project }: QRCodeDisplayProps) {
    const [open, setOpen] = useState(false)
    const checkpoint = project.checkpoints?.[0]

    if (!checkpoint?.qrCode) return null

    const handleDownload = async () => {
        try {
            // Dynamically import QRCode to avoid SSR issues
            const QRCode = (await import('qrcode')).default
            const qrDataUrl = await QRCode.toDataURL(checkpoint.qrCode, {
                width: 800,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            })

            // Create download link
            const link = document.createElement('a')
            link.href = qrDataUrl
            link.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}_QR.png`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            toast.success("QR code downloaded successfully")
        } catch (error) {
            toast.error("Failed to download QR code")
        }
    }

    const handlePrint = async () => {
        try {
            const QRCode = (await import('qrcode')).default
            const qrDataUrl = await QRCode.toDataURL(checkpoint.qrCode, {
                width: 600,
                margin: 2,
            })

            const printWindow = window.open('', '_blank')
            if (printWindow) {
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>QR Code - ${project.name}</title>
                        <style>
                            body {
                                margin: 0;
                                padding: 40px;
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: center;
                                font-family: Arial, sans-serif;
                            }
                            .header {
                                text-align: center;
                                margin-bottom: 30px;
                            }
                            h1 {
                                font-size: 32px;
                                font-weight: bold;
                                margin: 0 0 10px 0;
                                color: #1e293b;
                            }
                            .location {
                                font-size: 18px;
                                color: #64748b;
                                margin: 5px 0;
                            }
                            .qr-container {
                                border: 4px solid #10b981;
                                padding: 30px;
                                border-radius: 20px;
                                background: white;
                                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                            }
                            img {
                                display: block;
                                max-width: 100%;
                            }
                            .instructions {
                                margin-top: 30px;
                                text-align: center;
                                color: #64748b;
                                font-size: 16px;
                                max-width: 600px;
                            }
                            @media print {
                                body { padding: 20px; }
                                @page { margin: 20mm; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>${project.name}</h1>
                            <p class="location">${project.location || ''}</p>
                            <p class="location">Client: ${project.client?.name || 'N/A'}</p>
                        </div>
                        <div class="qr-container">
                            <img src="${qrDataUrl}" alt="QR Code" />
                        </div>
                        <div class="instructions">
                            <p><strong>Instructions:</strong> Scan this QR code with your mobile device to mark attendance at this location.</p>
                        </div>
                    </body>
                    </html>
                `)
                printWindow.document.close()
                printWindow.print()
            }
        } catch (error) {
            toast.error("Failed to print QR code")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 rounded-xl border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 transition-all"
                >
                    <QrCode className="h-4 w-4 mr-2 text-emerald-600" />
                    <span className="text-xs font-bold">QR Code</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black font-outfit uppercase tracking-tight">
                        Site QR Code
                    </DialogTitle>
                    <DialogDescription className="font-bold text-slate-400 font-outfit text-xs uppercase tracking-widest mt-2">
                        {project.name} - Attendance Check-In
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl border-2 border-emerald-200">
                        <QRCodeCanvas
                            value={checkpoint.qrCode}
                            size={280}
                            level="H"
                            className="rounded-2xl shadow-lg"
                        />
                    </div>

                    <div className="space-y-2 p-4 bg-slate-50 rounded-2xl">
                        <div className="flex items-start gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5" />
                            <div>
                                <p className="text-xs font-black text-slate-900 uppercase tracking-widest">
                                    Project: {project.name}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5" />
                            <div>
                                <p className="text-xs font-bold text-slate-600">
                                    Location: {project.location || 'N/A'}
                                </p>
                            </div>
                        </div>
                        {project.client && (
                            <div className="flex items-start gap-2">
                                <div className="h-2 w-2 rounded-full bg-purple-500 mt-1.5" />
                                <div>
                                    <p className="text-xs font-bold text-slate-600">
                                        Client: {project.client.name}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <Button
                            onClick={handleDownload}
                            className="flex-1 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-black uppercase tracking-wide text-xs"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Download PNG
                        </Button>
                        <Button
                            onClick={handlePrint}
                            variant="outline"
                            className="flex-1 h-12 rounded-xl border-2 border-slate-200 hover:bg-slate-50 font-black uppercase tracking-wide text-xs"
                        >
                            <Printer className="h-4 w-4 mr-2" />
                            Print
                        </Button>
                    </div>

                    <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
                        Print and display at site entrance for attendance scanning
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// Canvas-based QR Code component for better quality
function QRCodeCanvas({ value, size, level, className }: any) {
    const [qrDataUrl, setQrDataUrl] = useState("")

    useState(() => {
        const generateQR = async () => {
            try {
                const QRCode = (await import('qrcode')).default
                const url = await QRCode.toDataURL(value, {
                    width: size,
                    margin: 2,
                    errorCorrectionLevel: level || 'M',
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                })
                setQrDataUrl(url)
            } catch (error) {
                console.error('Failed to generate QR code:', error)
            }
        }
        generateQR()
    })

    if (!qrDataUrl) {
        return (
            <div 
                className={`${className} flex items-center justify-center bg-slate-100`}
                style={{ width: size, height: size }}
            >
                <QrCode className="h-12 w-12 text-slate-300 animate-pulse" />
            </div>
        )
    }

    return (
        <img 
            src={qrDataUrl} 
            alt="QR Code" 
            className={className}
            style={{ width: size, height: size }}
        />
    )
}
