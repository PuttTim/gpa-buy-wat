import { crc32, deflateSync } from "node:zlib"

/** Encodes RGBA pixels (width * height * 4 bytes) as a PNG. */
export function encodePNG(width: number, height: number, rgba: Uint8Array): Buffer {
    const chunk = (type: string, data: Buffer) => {
        const body = Buffer.concat([Buffer.from(type, "ascii"), data])
        const out = Buffer.alloc(body.length + 8)
        out.writeUInt32BE(data.length, 0)
        body.copy(out, 4)
        out.writeUInt32BE(crc32(body) >>> 0, body.length + 4)
        return out
    }
    const header = Buffer.alloc(13)
    header.writeUInt32BE(width, 0)
    header.writeUInt32BE(height, 4)
    header[8] = 8 // bit depth
    header[9] = 6 // RGBA
    const stride = width * 4
    const raw = Buffer.alloc((stride + 1) * height)
    for (let y = 0; y < height; y++) {
        raw[y * (stride + 1)] = 0 // no filter
        Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1)
    }
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk("IHDR", header),
        chunk("IDAT", deflateSync(raw, { level: 9 })),
        chunk("IEND", Buffer.alloc(0)),
    ])
}
