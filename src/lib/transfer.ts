import { useEffect, useRef, useState } from "react"
import { CalculationData } from "../interfaces/CalculationData"
import { SYSTEMS } from "./systems"

export interface Transcript {
    systemIndex: number
    data: CalculationData
}

// No 0/O or 1/I, and 32 symbols so every byte maps without bias. All valid Code 39.
// Matches ID_PATTERN in worker/index.ts.
const ID_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
const ID_LENGTH = 8
const ID_KEY = "gpa-buy-wat:import-id"
/** Under the 100 s Cloudflare allows an idle socket. Answered without waking the server. */
const PING_MS = 50 * 1000
const MAX_RETRY_MS = 30 * 1000
/** Close code the server uses when a newer socket takes over this ID. */
const REPLACED = 4000

/** One per tab, so it survives reloads but two tabs never share a barcode. */
const transferId = () => {
    try {
        const saved = sessionStorage.getItem(ID_KEY)
        if (saved && new RegExp(`^[${ID_ALPHABET}]{${ID_LENGTH}}$`).test(saved)) return saved
    } catch {
        // Blocked storage: a fresh ID per load is fine.
    }
    const bytes = crypto.getRandomValues(new Uint8Array(ID_LENGTH))
    const id = [...bytes].map(byte => ID_ALPHABET[byte & 31]).join("")
    try {
        sessionStorage.setItem(ID_KEY, id)
    } catch {}
    return id
}

export const transferBarcode = (systemIndex: number, id: string) =>
    `${SYSTEMS[systemIndex].name}-${id}`.toUpperCase()

/** Reads "NUS-K7Q9XM2A" style barcodes. The older GPA-only barcode returns null. */
export const parseTransferBarcode = (value: string) =>
    value.trim().toUpperCase().match(/^[A-Z]+-([2-9A-HJ-NP-Z]{8})$/)?.[1] ?? null

/**
 * Keeps this tab reachable for scanning while it's visible. Returns this tab's
 * barcode ID straight away, so the receipt never swaps barcodes while connecting.
 */
export const useTransferHost = (getTranscript: () => Transcript, onSent: () => void) => {
    const [id] = useState(transferId)
    const latest = useRef({ getTranscript, onSent })
    latest.current = { getTranscript, onSent }

    useEffect(() => {
        let socket: WebSocket | null = null
        let ping = 0
        let retry = 0
        let delay = 1000

        const disconnect = () => {
            clearInterval(ping)
            clearTimeout(retry)
            if (socket) {
                socket.onclose = null
                socket.close(1000)
                socket = null
            }
        }

        const connect = () => {
            if (socket || document.visibilityState !== "visible") return
            const url = new URL(`/api/imports/${id}`, location.href)
            url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
            const current = new WebSocket(url)
            socket = current
            current.onopen = () => {
                delay = 1000
                ping = window.setInterval(() => current.send("ping"), PING_MS)
            }
            current.onmessage = event => {
                if (event.data === "pong") return
                let message: any
                try {
                    message = JSON.parse(event.data)
                } catch {
                    return
                }
                if (message?.type !== "request") return
                current.send(
                    JSON.stringify({ type: "transcript", id: message.id, transcript: latest.current.getTranscript() }),
                )
                latest.current.onSent()
            }
            current.onclose = event => {
                clearInterval(ping)
                socket = null
                // Another tab with this ID (a duplicated tab) took over. Wait until this one is looked at again.
                if (event.code === REPLACED) return
                retry = window.setTimeout(connect, delay)
                delay = Math.min(delay * 2, MAX_RETRY_MS)
            }
        }

        // Hidden tabs can't be scanned, so they don't hold a socket open.
        const onVisibility = () => (document.visibilityState === "visible" ? connect() : disconnect())
        document.addEventListener("visibilitychange", onVisibility)
        connect()
        return () => {
            document.removeEventListener("visibilitychange", onVisibility)
            disconnect()
        }
    }, [id])

    return id
}

/** Asks the device showing the barcode for its grades, right now. */
export const pullTranscript = async (id: string) => {
    const response = await fetch(`/api/imports/${id}/pull`, { method: "POST" })
    if (response.status === 404)
        throw new Error("That device isn't reachable. Open GPA Buy What on it and keep the receipt on screen.")
    if (response.status === 504) throw new Error("That device didn't answer. Try scanning again.")
    if (!response.ok) throw new Error("Couldn't fetch the grades. Try again.")
    return (await response.json()) as Transcript
}

const SAMPLE_RATE = 22050
const FADE_IN_SECONDS = 0.004
const FADE_OUT_SECONDS = 0.008

interface Tone {
    hz: number
    seconds: number
    wave: (phase: number) => number
    /** Peak level, 0 to 1. */
    level: number
    /** Silence after this tone. */
    gap?: number
}

const sine = (phase: number) => Math.sin(2 * Math.PI * phase)
const triangle = (phase: number) => 1 - 4 * Math.abs(((phase + 0.25) % 1) - 0.5)

/** A soft checkout beep, a short pause, then a quick classic-scanner beep. */
const BEEP: Tone[] = [
    { hz: 1800, seconds: 0.12, wave: sine, level: 0.3, gap: 0.03 },
    { hz: 2650, seconds: 0.06, wave: triangle, level: 0.24 },
]

let beepUrl: string | null = null

/** The beep as a tiny WAV, so it plays through an <audio> element. */
const beepWav = () => (beepUrl ??= makeWav(BEEP))

const makeWav = (tones: Tone[]) => {
    const pcm: number[] = []
    for (const tone of tones) {
        const samples = Math.round(SAMPLE_RATE * tone.seconds)
        const fadeIn = SAMPLE_RATE * FADE_IN_SECONDS
        const fadeOut = SAMPLE_RATE * FADE_OUT_SECONDS
        for (let i = 0; i < samples; i++) {
            const envelope = Math.min(1, i / fadeIn, (samples - i) / fadeOut)
            pcm.push(Math.round(tone.wave((tone.hz * i) / SAMPLE_RATE) * envelope * tone.level * 32767))
        }
        for (let i = Math.round(SAMPLE_RATE * (tone.gap ?? 0)); i > 0; i--) pcm.push(0)
    }

    const view = new DataView(new ArrayBuffer(44 + pcm.length * 2))
    const text = (offset: number, value: string) =>
        [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)))
    text(0, "RIFF")
    view.setUint32(4, 36 + pcm.length * 2, true)
    text(8, "WAVEfmt ")
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true) // PCM
    view.setUint16(22, 1, true) // mono
    view.setUint32(24, SAMPLE_RATE, true)
    view.setUint32(28, SAMPLE_RATE * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    text(36, "data")
    view.setUint32(40, pcm.length * 2, true)
    pcm.forEach((sample, i) => view.setInt16(44 + i * 2, sample, true))
    return URL.createObjectURL(new Blob([view], { type: "audio/wav" }))
}

export interface Beep {
    play(): void
}

/**
 * Call from the tap that opens the scanner. iOS only lets a page play sound it
 * started from a tap, so the clip is played silently once here, which allows
 * playing it again later when a barcode is found.
 */
export const primeBeep = (): Beep => {
    const audio = new Audio(beepWav())
    audio.muted = true
    audio
        .play()
        .then(() => {
            audio.pause()
            audio.currentTime = 0
            audio.muted = false
        })
        .catch(() => {})
    return {
        play: () => {
            audio.muted = false
            audio.currentTime = 0
            audio.play().catch(() => {})
        },
    }
}
