"use client"

import React, { useState, useTransition, useCallback, useRef, useEffect } from "react"
import dynamic from "next/dynamic"

const Scanner = dynamic(() => import("@yudiel/react-qr-scanner").then((mod) => mod.Scanner), {
  ssr: false,
})
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { QrCode, Loader2, CheckCircle2, UserCheck } from "lucide-react"
import { markAttendanceAction } from "../actions"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

interface QRCheckInScannerProps {
  eventId: string
  onCheckIn: (ticketId: string) => void
  tickets: { id: string; attendance_status: string; candidate_name?: string }[]
}

const SCANNER_COMPONENTS = {
  audio: false,
  onOff: false,
  torch: false,
  zoom: false,
  finder: true,
}

const SCANNER_STYLES = {
  container: { width: "100%", height: "100%", margin: "0 auto" },
  video: { objectFit: "cover" as const },
}

/** Instant zero-latency Web Audio chime */
const playSuccessBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(880, ctx.currentTime) // A5 tone
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1) // E6 chime up

    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.15)
  } catch {}
}

export function QRCheckInScanner({ eventId, onCheckIn, tickets }: QRCheckInScannerProps) {
  const [open, setOpen] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)
  const [showAlreadyPresentOverlay, setShowAlreadyPresentOverlay] = useState(false)
  const [showMoveQrOverlay, setShowMoveQrOverlay] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  const isScanningBlockedRef = useRef(false)
  const lastScannedRef = useRef<string | null>(null)
  const clearLastScannedTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const ticketsRef = useRef(tickets)
  const onCheckInRef = useRef(onCheckIn)

  const [lastCheckedInName, setLastCheckedInName] = useState<string | null>(null)

  useEffect(() => {
    ticketsRef.current = tickets
    onCheckInRef.current = onCheckIn
    setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
  }, [tickets, onCheckIn])

  const handleScan = useCallback((results: { rawValue: string }[]) => {
    if (results.length === 0) return
    const rawPayload = results[0].rawValue?.trim()
    if (!rawPayload) return

    if (isScanningBlockedRef.current) return
    isScanningBlockedRef.current = true

    const ticketId = rawPayload
    
    // Quick debounce for duplicate scans of the same ticket ID
    if (ticketId === lastScannedRef.current) {
      setShowMoveQrOverlay(true)
      setTimeout(() => { 
        setShowMoveQrOverlay(false)
        isScanningBlockedRef.current = false
      }, 800)
      return
    }

    lastScannedRef.current = ticketId
    if (clearLastScannedTimeoutRef.current) clearTimeout(clearLastScannedTimeoutRef.current)
    clearLastScannedTimeoutRef.current = setTimeout(() => {
      lastScannedRef.current = null
    }, 3000)

    const ticket = ticketsRef.current.find((t) => t.id === ticketId)

    if (ticket && ticket.attendance_status === "Present") {
      toast.error(`${ticket.candidate_name || 'Attendee'} is already checked in!`)
      setLastCheckedInName(ticket.candidate_name || 'Unknown Attendee')
      setShowAlreadyPresentOverlay(true)
      setTimeout(() => { 
        setShowAlreadyPresentOverlay(false)
        isScanningBlockedRef.current = false
      }, 900)
      return
    }

    // Play crisp instant chime feedback
    playSuccessBeep()
    
    startTransition(async () => {
      try {
        const result = await markAttendanceAction(rawPayload, eventId)
        
        const name = result.candidateName || ticket?.candidate_name || "Unknown Attendee"
        toast.success(`${name} checked in!`)
        setLastCheckedInName(name)
        setShowSuccessOverlay(true)
        onCheckInRef.current(ticketId)
        
      } catch (err: any) {
        const msg = err.message || "Failed to check in on server."
        if (msg.includes("already been checked in") || msg.includes("already")) {
          setLastCheckedInName(ticket?.candidate_name || "Unknown Attendee")
          setShowAlreadyPresentOverlay(true)
          toast.error(`${ticket?.candidate_name || 'Attendee'} is already checked in!`)
        } else {
          toast.error(msg)
        }
      } finally {
        setTimeout(() => { 
          setShowSuccessOverlay(false)
          setShowAlreadyPresentOverlay(false)
          isScanningBlockedRef.current = false
        }, 900)
      }
    })
  }, [eventId])

  const handleError = useCallback((error: any) => {
    const msg = error?.message || error?.name || (typeof error === 'string' ? error : JSON.stringify(error) || "Unknown Error")
    if (msg.includes("NotAllowedError") || msg.includes("permission") || msg.includes("secure context")) {
      console.warn("Camera blocked by browser.", error)
      setCameraError("Camera access blocked! On mobile browsers, HTTPS or localhost is required.")
      return
    }
    console.warn("QR Scanner Issue:", error)
    setCameraError("Camera issue: " + msg)
  }, [])

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val)
      if (!val) {
        isScanningBlockedRef.current = false
        lastScannedRef.current = null
        if (clearLastScannedTimeoutRef.current) clearTimeout(clearLastScannedTimeoutRef.current)
        setLastCheckedInName(null)
        setCameraError(null)
        setShowSuccessOverlay(false)
        setShowAlreadyPresentOverlay(false)
        setShowMoveQrOverlay(false)
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-1.5 h-10 rounded-xl text-xs font-semibold shadow-sm">
          <QrCode className="h-4 w-4" />
          Scan QR
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md w-[95vw] max-h-[95vh] rounded-2xl overflow-y-auto overflow-x-hidden p-0 bg-background flex flex-col gap-0 border shadow-2xl">
        <div className="p-4 sm:p-5 border-b bg-muted/20 shrink-0">
          <DialogHeader className="text-left">
            <DialogTitle className="text-foreground text-base font-semibold">Scan QR Ticket</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Point camera at attendee QR ticket for quick check-in.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <div className="flex flex-col w-full bg-muted/10">
          <div className={cn(
            "relative bg-black w-full aspect-square shrink-0 overflow-hidden shadow-inner transition-all duration-300",
            showSuccessOverlay && "ring-4 ring-emerald-500/80 ring-inset"
          )}>
            {isPending && (
              <div className="absolute inset-0 z-10 bg-black/60 flex flex-col items-center justify-center text-white gap-3 backdrop-blur-sm transition-all">
                <Loader2 className="h-7 w-7 animate-spin text-emerald-400" />
                <p className="text-xs font-medium tracking-wide animate-pulse">Checking ticket...</p>
              </div>
            )}
            
            {cameraError && (
              <div className="absolute inset-0 z-10 bg-black/90 p-6 flex flex-col items-center justify-center text-center">
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive-foreground">
                  <AlertTitle className="text-sm font-bold">Camera Blocked</AlertTitle>
                  <AlertDescription className="text-xs mt-2 leading-relaxed">
                    {cameraError}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Clean, minimal floating badge overlays for scanning state */}
            {showSuccessOverlay && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-emerald-600/90 text-white backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-emerald-400/40 flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-200 shrink-0" />
                <div className="text-xs font-semibold truncate max-w-50">
                  Present: <span className="font-bold">{lastCheckedInName}</span>
                </div>
              </div>
            )}

            {showAlreadyPresentOverlay && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-amber-600/90 text-white backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-amber-400/40 flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-200">
                <UserCheck className="h-4 w-4 text-amber-200 shrink-0" />
                <div className="text-xs font-semibold truncate max-w-50">
                  Already Present: <span className="font-bold">{lastCheckedInName}</span>
                </div>
              </div>
            )}

            {showMoveQrOverlay && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-blue-600/90 text-white backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-blue-400/40 flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-200">
                <QrCode className="h-4 w-4 text-blue-200 shrink-0" />
                <div className="text-xs font-semibold">
                  Please scan next QR code
                </div>
              </div>
            )}
            
            {open && !cameraError && (
              <Scanner
                onScan={handleScan}
                onError={handleError}
                components={SCANNER_COMPONENTS}
                styles={{
                  ...SCANNER_STYLES,
                  video: { ...SCANNER_STYLES.video, transform: isMobile ? "none" : "scaleX(-1)" }
                }}
              />
            )}
          </div>

          {/* Results Bar */}
          <div className="w-full p-4 sm:p-5 min-h-22.5 flex items-center justify-start border-t bg-background shrink-0">
            {lastCheckedInName ? (
              <div className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 shadow-sm text-left">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 opacity-80 mb-0.5">
                    Marked Present
                  </span>
                  <span className="font-semibold text-sm text-foreground truncate block">
                    {lastCheckedInName}
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full flex items-center justify-start gap-3 text-muted-foreground animate-pulse p-2 text-left">
                <QrCode className="h-5 w-5 shrink-0 opacity-50" />
                <p className="text-xs">Ready to scan. Waiting for attendee QR...</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
