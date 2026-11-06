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
