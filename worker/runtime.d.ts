// The parts of the Workers runtime this Worker uses, so it type-checks without
// pulling in the full runtime types.

interface DurableObjectState {
    acceptWebSocket(socket: WebSocket, tags?: string[]): void
    getWebSockets(tag?: string): WebSocket[]
    setWebSocketAutoResponse(pair: WebSocketRequestResponsePair): void
}

interface DurableObjectStub {
    fetch(request: Request): Promise<Response>
}

interface DurableObjectNamespace {
    idFromName(name: string): unknown
    get(id: unknown): DurableObjectStub
}

interface Ai {
    run(model: string, input: unknown): Promise<any>
}

interface RateLimit {
    limit(options: { key: string }): Promise<{ success: boolean }>
}

declare class WebSocketPair {
    0: WebSocket
    1: WebSocket
}

declare class WebSocketRequestResponsePair {
    constructor(request: string, response: string)
}

interface ResponseInit {
    webSocket?: WebSocket
}
