import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { calculateGPA } from "@/lib/calculation"
import { getDetector, openCamera } from "@/lib/scanner"
import { sanitizeData } from "@/lib/storage"
import { SYSTEMS } from "@/lib/systems"
import { Beep, parseImportBarcode, pullTranscript, Transcript } from "@/lib/transfer"
import { PasteImport } from "./PasteImport"

type Step =
    | { kind: "scanning" }
    | { kind: "loading"; barcode: string }
    | { kind: "confirm"; transcript: Transcript }
    | { kind: "error"; message: string }

interface ImportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Primed on the tap that opened the dialog, so phones allow it to play. */
    beep: Beep | null
    /** The tab pasted grades import into. */
    systemIndex: number
    onImport: (transcript: Transcript) => void
}

const SCAN_INTERVAL_MS = 150

export const ImportDialog = ({ open, onOpenChange, beep, systemIndex, onImport }: ImportDialogProps) => {
    const [mode, setMode] = useState<"scan" | "paste">("scan")
    const [step, setStep] = useState<Step>({ kind: "scanning" })
    const [hint, setHint] = useState("")
    const video = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        if (!open || mode !== "scan" || step.kind !== "scanning") return
        let stream: MediaStream | null = null
        let timer = 0
        let stopped = false

        const stop = () => {
            stopped = true
            clearTimeout(timer)
            stream?.getTracks().forEach(track => track.stop())
        }

        const found = async (barcode: string) => {
            const id = parseImportBarcode(barcode)
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
                setStep({ kind: "confirm", transcript })
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
    }, [open, mode, step.kind, beep])

    const reset = () => {
        setMode("scan")
        setHint("")
        setStep({ kind: "scanning" })
    }

    return (
        <Dialog
            open={open}
            onOpenChange={next => {
                onOpenChange(next)
                if (!next) reset()
            }}>
            <DialogContent>
                <DialogTitle>Import grades</DialogTitle>
                <Tabs value={mode} onValueChange={value => setMode(value as "scan" | "paste")}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="scan">Scan barcode</TabsTrigger>
                        <TabsTrigger value="paste">Paste grades</TabsTrigger>
                    </TabsList>
                </Tabs>
                {mode === "paste" && (
                    <PasteImport
                        systemIndex={systemIndex}
                        onImport={data => {
                            onImport({ systemIndex, data })
                            onOpenChange(false)
                            reset()
                        }}
                    />
                )}
                {mode === "scan" && step.kind === "scanning" && (
                    <>
                        <DialogDescription>
                            Point your camera at the barcode on another device's receipt.
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
                {mode === "scan" && step.kind === "loading" && (
                    <DialogDescription>
                        Scanned <span className="font-mono">{step.barcode}</span>. Asking that device for its grades...
                    </DialogDescription>
                )}
                {mode === "scan" && step.kind === "confirm" && (
                    <ConfirmImport
                        transcript={step.transcript}
                        onCancel={() => onOpenChange(false)}
                        onImport={() => {
                            onImport(step.transcript)
                            onOpenChange(false)
                            reset()
                        }}
                    />
                )}
                {mode === "scan" && step.kind === "error" && (
                    <>
                        <DialogDescription>{step.message}</DialogDescription>
                        <Button onClick={reset}>Scan again</Button>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}

const ConfirmImport = ({
    transcript,
    onCancel,
    onImport,
}: {
    transcript: Transcript
    onCancel: () => void
    onImport: () => void
}) => {
    const { data } = transcript
    const system = SYSTEMS[transcript.systemIndex]
    const modules = data.semesters.flatMap(semester => semester.modules)
    const gpa = calculateGPA(modules, data.totalCredits, Number(data.currentGPA) || 0)
    return (
        <>
            <DialogDescription>
                Found {modules.length} {modules.length === 1 ? "module" : "modules"} across{" "}
                {data.semesters.length} {data.semesters.length === 1 ? "semester" : "semesters"}
                {gpa === null ? "" : `, GPA ${gpa.toFixed(2)}`}. This replaces everything in your {system.name} tab.
            </DialogDescription>
            <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button onClick={onImport}>Import</Button>
            </div>
        </>
    )
}
