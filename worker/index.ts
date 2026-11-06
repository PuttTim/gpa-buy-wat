// Lets another device import a transcript by scanning the receipt's barcode.
//
// The device showing the barcode keeps a WebSocket open to a GPABuyWhatImports
// Durable Object named after its barcode ID. When a phone scans it, the phone
// asks that object for the grades, the object asks the open device, and passes
// the reply straight back. Nothing is stored.
//
// Sockets use the hibernation API, so an idle device costs no duration, and
// keepalive pings are answered by the runtime without waking the object.
// Static assets are served by Cloudflare; only /api/* reaches this Worker.

interface Env {
    IMPORTS: DurableObjectNamespace
    CONNECT_LIMIT: RateLimit
    PULL_LIMIT: RateLimit
}

const MAX_MESSAGE_BYTES = 32 * 1024
const PULL_TIMEOUT_MS = 10_000
const HOST = "host"
// No 0/O or 1/I. All valid Code 39. Matches src/lib/transfer.ts.
const ID_PATTERN = /^[2-9A-HJ-NP-Z]{8}$/

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
    })

const error = (status: number, message: string) => json({ error: message }, status)

const isString = (value: unknown, max: number) => typeof value === "string" && value.length <= max
const isNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 999

/** Only the shape is checked here. The importing device sanitizes values itself. */
const isTranscript = (body: any) =>
    Number.isInteger(body?.systemIndex) &&
    body.systemIndex >= 0 &&
    body.systemIndex < 16 &&
    isString(body.data?.currentGPA, 16) &&
    isNumber(body.data?.totalCredits) &&
    Array.isArray(body.data?.semesters) &&
    body.data.semesters.length <= 40 &&
    body.data.semesters.every(
        (semester: any) =>
            isString(semester?.name, 100) &&
            Array.isArray(semester.modules) &&
            semester.modules.length <= 40 &&
            semester.modules.every(
                (module: any) =>
                    isString(module?.name, 100) && isString(module.grade, 32) && isNumber(module.credits),
            ),
    )

export class GPABuyWhatImports {
    /** Pulls waiting for the open device to answer. Only lives while a pull request is in flight. */
    private pending = new Map<string, (transcript: unknown) => void>()

    constructor(private ctx: DurableObjectState) {
        // Answered by the runtime itself: no wake-up, no duration.
        ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"))
    }

    async fetch(request: Request) {
        if (request.headers.get("upgrade") === "websocket") return this.connect()
        return this.pull()
    }

    private connect() {
        // One device per barcode; a reconnect replaces the old socket.
        for (const socket of this.ctx.getWebSockets(HOST)) socket.close(4000, "Replaced")
        const pair = new WebSocketPair()
        this.ctx.acceptWebSocket(pair[1], [HOST])
        return new Response(null, { status: 101, webSocket: pair[0] })
    }

    private async pull() {
        const hosts = this.ctx.getWebSockets(HOST)
        if (hosts.length === 0) return error(404, "offline")

        const id = crypto.randomUUID()
        const reply = new Promise<unknown>(resolve => this.pending.set(id, resolve))
        const message = JSON.stringify({ type: "request", id })
        for (const socket of hosts) socket.send(message)

        let timer = 0
        const timeout = new Promise<null>(resolve => {
            timer = setTimeout(() => resolve(null), PULL_TIMEOUT_MS)
        })
        const transcript = await Promise.race([reply, timeout])
        clearTimeout(timer)
        this.pending.delete(id)
        return transcript === null ? error(504, "timeout") : json(transcript)
    }

    webSocketMessage(_socket: WebSocket, message: string | ArrayBuffer) {
        if (typeof message !== "string" || message.length > MAX_MESSAGE_BYTES) return
        let body: any
        try {
            body = JSON.parse(message)
        } catch {
            return
        }
        if (body?.type !== "transcript" || typeof body.id !== "string") return
        if (!isTranscript(body.transcript)) return
        this.pending.get(body.id)?.({ systemIndex: body.transcript.systemIndex, data: body.transcript.data })
    }

    webSocketClose(socket: WebSocket, code: number) {
        // Completes the closing handshake; 1005/1006 can't be sent back.
        socket.close(code === 1005 || code === 1006 ? 1000 : code, "Closed")
    }
}

export default {
    async fetch(request: Request, env: Env) {
        const url = new URL(request.url)
        const match = url.pathname.match(/^\/api\/imports\/([^/]+)(\/pull)?$/)
        if (!match) return error(404, "Not found")
        const id = match[1].toUpperCase()
        if (!ID_PATTERN.test(id)) return error(404, "Not found")

        // Browsers send Origin on WebSocket upgrades and POSTs; requiring our own stops other sites.
        if (request.headers.get("origin") !== url.origin) return error(403, "Forbidden")
        const ip = request.headers.get("cf-connecting-ip") ?? "unknown"
        const stub = env.IMPORTS.get(env.IMPORTS.idFromName(id))

        const isPull = match[2] === "/pull"
        if (!isPull && request.method === "GET" && request.headers.get("upgrade") === "websocket") {
            if (!(await env.CONNECT_LIMIT.limit({ key: ip })).success) return error(429, "Too many requests")
            return stub.fetch(request)
        }
        if (isPull && request.method === "POST") {
            if (!(await env.PULL_LIMIT.limit({ key: ip })).success) return error(429, "Too many requests")
            return stub.fetch(request)
        }
        return error(405, "Method not allowed")
    },
}
