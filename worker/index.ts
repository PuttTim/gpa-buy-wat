// Lets another device copy a transcript by scanning the receipt's barcode.
//
// The device showing the barcode keeps a WebSocket open to a GPABuyWhatImports
// Durable Object named after its barcode ID. When a phone scans it, the phone
// asks that object for the grades, the object asks the open device, and passes
// the reply straight back. Nothing is stored.
//
// Sockets use the hibernation API, so an idle device costs no duration, and
// keepalive pings are answered by the runtime without waking the object.
// Static assets are served by Cloudflare; only /api/* reaches this Worker.
//
// One more object of the same class, named PARSE_BUDGET, counts Clairic reads
// across everyone, so the AI bill has a hard daily ceiling.

interface Env {
    IMPORTS: DurableObjectNamespace
    CONNECT_LIMIT: RateLimit
    PULL_LIMIT: RateLimit
    AI: Ai
    PARSE_LIMIT: RateLimit
}

const MAX_MESSAGE_BYTES = 32 * 1024
const PULL_TIMEOUT_MS = 10_000
const HOST = "host"
// No 0/O or 1/I. All valid Code 39. Matches src/lib/transfer.ts.
const ID_PATTERN = /^[2-9A-HJ-NP-Z]{8}$/
// Can't clash with a barcode ID: those are 8 characters with no lowercase.
const PARSE_BUDGET = "parse-budget"
/** Clairic reads allowed per UTC day, across every user. */
const PARSE_DAILY_LIMIT = 2000
/**
 * Where a new Durable Object is created. Only applies the first time an object is
 * made; Cloudflare offers regions, not cities, and "apac" includes Singapore.
 */
const LOCATION = { locationHint: "apac" }

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
    })

const error = (status: number, message: string) => json({ error: message }, status)

const isString = (value: unknown, max: number) => typeof value === "string" && value.length <= max
const isNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 999

/** Only the shape is checked here. The receiving device sanitizes values itself. */
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
        if (new URL(request.url).pathname === `/${PARSE_BUDGET}`) return this.spendParse()
        if (request.headers.get("upgrade") === "websocket") return this.connect()
        return this.pull()
    }

    /** Only on the PARSE_BUDGET object. Counts one read; 429 once today's budget is gone. */
    private async spendParse() {
        const today = new Date().toISOString().slice(0, 10)
        const saved = await this.ctx.storage.get<{ day: string; count: number }>(PARSE_BUDGET)
        const count = saved?.day === today ? saved.count : 0
        if (count >= PARSE_DAILY_LIMIT) return error(429, "Daily limit reached")
        // Requests to one object run one at a time, so this read-then-write can't race.
        await this.ctx.storage.put(PARSE_BUDGET, { day: today, count: count + 1 })
        return json({ ok: true })
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

// Reading pasted grades with Clairic, for what the browser's own parser
// (src/lib/parseGrades.ts) couldn't finish. Text only: screenshots read too
// poorly to trust (misread codes, invented rows).
const MAX_PARSE_BYTES = 32 * 1024
const MAX_TEXT = 10_000
const MAX_MODULES = 60
const MODULE_CODE = /^([A-Z]{2,4}-)?[A-Z]{2,4}\d{3,4}[A-Z]{0,2}$/
const CLAIRIC = "@cf/cloudflare/clairic"

/** Clairic's confidence as 0 to 1. Anything unexpected counts as 0, so it gets checked. */
const confidence = (answer: any) => {
    const value = Number(answer?.confidence)
    return Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0
}

const readFields = (env: Env, text: string, fields: Record<string, unknown>) =>
    env.AI.run(CLAIRIC, { model: "clairic", state: text, fields })

const parse = async (request: Request, env: Env) => {
    if (request.method !== "POST") return error(405, "Method not allowed")
    if (!request.headers.get("content-type")?.startsWith("application/json")) return error(415, "Expected JSON")
    if (Number(request.headers.get("content-length")) > MAX_PARSE_BYTES) return error(413, "Too large")
    const ip = request.headers.get("cf-connecting-ip") ?? "unknown"
    if (!(await env.PARSE_LIMIT.limit({ key: ip })).success) return error(429, "Too many requests")

    const body = await request.text()
    if (body.length > MAX_PARSE_BYTES) return error(413, "Too large")
    let input: any
    try {
        input = JSON.parse(body)
    } catch {
        return error(400, "Invalid JSON")
    }
    const text = typeof input?.text === "string" ? input.text.slice(0, MAX_TEXT) : ""
    if (!text.trim()) return error(400, "Nothing to read")
    // Last check before spending anything, so bad requests don't use up the budget.
    const budget = env.IMPORTS.get(env.IMPORTS.idFromName(PARSE_BUDGET), LOCATION)
    const spent = await budget.fetch(new Request(`https://budget/${PARSE_BUDGET}`, { method: "POST" }))
    // Only a real "spent" blocks. Previews share production's Durable Objects, so they run
    // production's copy of this class, which may not count yet; a hiccup shouldn't block either.
    if (spent.status === 429) return error(503, "Daily limit reached")
    const known: string[] = Array.isArray(input?.codes)
        ? input.codes.filter((code: unknown) => typeof code === "string" && MODULE_CODE.test(code))
        : []

    try {
        // Codes come from the browser when it found them; otherwise Clairic finds them first.
        let codes = known
        if (codes.length === 0) {
            const found = await readFields(env, text, {
                module_codes: {
                    type: "list",
                    items: "text",
                    instructions: "Every course or module code, such as CS2030, SC1003, IS111 or COR-STAT1202, in the order they appear",
                },
            })
            const listed: unknown[] = found?.answers?.module_codes?.value ?? []
            codes = listed
                .map(code => String(code).toUpperCase().replace(/\s+/g, ""))
                .filter(code => MODULE_CODE.test(code))
        }
        codes = [...new Set(codes)].slice(0, MAX_MODULES)
        if (codes.length === 0) return json({ modules: [] })

        // One grade and one credits field per module, so a missed answer can't shift onto another module.
        const fields: Record<string, unknown> = {}
        codes.forEach((code, i) => {
            fields[`grade_${i}`] = { type: "text", instructions: `The grade received for ${code}, exactly as written` }
            fields[`credits_${i}`] = { type: "number", instructions: `The credits, units or MCs for ${code}` }
        })
        const result = await readFields(env, text, fields)
        const answers = result?.answers ?? {}
        const modules = codes.map((code, i) => ({
            code,
            grade: typeof answers[`grade_${i}`]?.value === "string" ? answers[`grade_${i}`].value : null,
            gradeConfidence: confidence(answers[`grade_${i}`]),
            credits: typeof answers[`credits_${i}`]?.value === "number" ? answers[`credits_${i}`].value : null,
            creditsConfidence: confidence(answers[`credits_${i}`]),
        }))
        return json({ modules })
    } catch {
        return error(502, "Couldn't read that")
    }
}

export default {
    async fetch(request: Request, env: Env) {
        const url = new URL(request.url)
        if (url.pathname === "/api/parse") {
            if (request.headers.get("origin") !== url.origin) return error(403, "Forbidden")
            return parse(request, env)
        }
        const match = url.pathname.match(/^\/api\/imports\/([^/]+)(\/pull)?$/)
        if (!match) return error(404, "Not found")
        const id = match[1].toUpperCase()
        if (!ID_PATTERN.test(id)) return error(404, "Not found")

        // Browsers send Origin on WebSocket upgrades and POSTs; requiring our own stops other sites.
        if (request.headers.get("origin") !== url.origin) return error(403, "Forbidden")
        const ip = request.headers.get("cf-connecting-ip") ?? "unknown"
        const stub = env.IMPORTS.get(env.IMPORTS.idFromName(id), LOCATION)

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
