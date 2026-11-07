import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { getDetector, openCamera } from "@/lib/scanner"
import { sanitizeData } from "@/lib/storage"
import { SYSTEMS } from "@/lib/systems"
import { Beep } from "@/lib/sounds"
import { parseTransferBarcode, pullTranscript, Transcript } from "@/lib/transfer"

type Step =
    | { kind: "scanning" }
    | { kind: "loading"; barcode: string }
    | { kind: "error"; message: string }

interface ScanDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Primed on the tap that opened the dialog, so phones allow it to play. */
    beep: Beep | null
    /** Called as soon as the grades arrive; the dialog then closes. */
    onCopy: (transcript: Transcript) => void
}

const SCAN_INTERVAL_MS = 150

export const ScanDialog = ({ open, onOpenChange, beep, onCopy }: ScanDialogProps) => {
    const [step, setStep] = useState<Step>({ kind: "scanning" })
    const [hint, setHint] = useState("")
    const video = useRef<HTMLVideoElement>(null)
    // Read through a ref so a parent re-render doesn't restart the camera.
    const done = useRef({ open, onCopy, onOpenChange })
    done.current = { open, onCopy, onOpenChange }

    const reset = () => {
        setHint("")
        setStep({ kind: "scanning" })
    }

    useEffect(() => {
        if (!open || step.kind !== "scanning") return
        let stream: MediaStream | null = null
        let timer = 0
        let stopped = false

        const stop = () => {
            stopped = true
            clearTimeout(timer)
            stream?.getTracks().forEach(track => track.stop())
        }

        const found = async (barcode: string) => {
            const id = parseTransferBarcode(barcode)
            if (!id) {
                setHint("That isn't a GPA Buy What receipt barcode. Look for one like NUS-K7Q9XM2A.")
                return false
            }
            stop()
            beep?.play()
            setStep({ kind: "loading", barcode })
            try {
                const raw = await pullTranscript(id)
                if (!Number.isInteger(raw?.systemIndex) || !SYSTEMS[raw.systemIndex]) throw new Error("This barcode isn't a GPA Buy What transcript.")
                const transcript = { systemIndex: raw.systemIndex, data: sanitizeData(raw.data, raw.systemIndex) }
                // Closed while waiting: they changed their mind, so don't copy.
                if (!done.current.open) return true
                done.current.onCopy(transcript)
                done.current.onOpenChange(false)
                reset()
            } catch (error) {
                setStep({ kind: "error", message: error instanceof Error ? error.message : "Something went wrong." })
            }
            return true
        }

        ;(async () => {
            try {
                const [camera, detector] = await Promise.all([openCamera(), getDetector()])
                stream = camera
                if (stopped) return stop()
                video.current!.srcObject = camera
                await video.current!.play()
                const tick = async () => {
                    if (stopped) return
                    const codes = await detector.detect(video.current!).catch(() => [])
                    for (const code of codes) if (await found(code.rawValue)) return
                    timer = window.setTimeout(tick, SCAN_INTERVAL_MS)
                }
                tick()
            } catch (error) {
                const denied = error instanceof DOMException && error.name === "NotAllowedError"
                setStep({
                    kind: "error",
                    message: denied
                        ? "Camera access was blocked. Allow it in your browser's site settings, then try again."
                        : "Couldn't start the camera on this device.",
                })
            }
        })()
        return stop
    }, [open, step.kind, beep])

    return (
        <Dialog
            open={open}
            onOpenChange={next => {
                onOpenChange(next)
                if (!next) reset()
            }}>
            <DialogContent>
                <DialogTitle>Scan a receipt</DialogTitle>
                {step.kind === "scanning" && (
                    <>
                        <DialogDescription>
                            Copy grades from another device. Open this site there, then point your camera at the barcode on its receipt.
                        </DialogDescription>
                        <div className="relative overflow-hidden rounded-md bg-black">
                            <video ref={video} playsInline muted className="aspect-video w-full object-cover" />
                            {/* Where to aim: a barcode is wide and short. */}
                            <div className="pointer-events-none absolute inset-x-6 top-1/2 h-1/3 -translate-y-1/2 rounded-sm border-2 border-white/80" />
                        </div>
                        <p role="status" className="text-muted-foreground empty:hidden">
                            {hint}
                        </p>
                    </>
                )}
                {step.kind === "loading" && (
                    <DialogDescription>
                        Scanned <span className="font-mono">{step.barcode}</span>. Asking that device for its grades...
                    </DialogDescription>
                )}
                {step.kind === "error" && (
                    <>
                        <DialogDescription>{step.message}</DialogDescription>
                        <Button onClick={reset}>Scan again</Button>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
