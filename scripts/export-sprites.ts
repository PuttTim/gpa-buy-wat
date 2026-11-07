/**
 * Exports the hand-authored food sprites in scripts/sprites/ to public/food/.
 *
 *   node scripts/export-sprites.ts                  write public/food/*.png
 *   node scripts/export-sprites.ts --sheet out.png  also write a contact sheet
 *   node scripts/export-sprites.ts --zoom out.png   also write a zoomed grid view
 *
 * Each sprite is a 16x16 character grid. It is upscaled 16x with nearest
 * neighbour to 256x256, so every source pixel is an exact 16x16 block.
 */
import { writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { encodePNG } from "./sprites/png.ts"
import { PALETTE } from "./sprites/palette.ts"
import { SPRITES, type Sprite } from "./sprites/index.ts"

const SIZE = 16
const OUT = 256
const MAX_FILL_COLOURS = 6 // per sprite, not counting the outline (K or N)

type RGBA = [number, number, number, number]
const hex = (h: string): RGBA => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).concat(255) as RGBA

function validate({ name, grid }: Sprite) {
    if (grid.length !== SIZE) throw new Error(`${name}: ${grid.length} rows, want ${SIZE}`)
    const used = new Set<string>()
    grid.forEach((row, y) => {
        if (row.length !== SIZE) throw new Error(`${name}: row ${y} is ${row.length} wide, want ${SIZE}`)
        for (const c of row) {
            if (!(c in PALETTE)) throw new Error(`${name}: row ${y} has unknown colour "${c}"`)
            if (c !== "." && c !== "K" && c !== "N") used.add(c)
        }
    })
    if (used.size > MAX_FILL_COLOURS) throw new Error(`${name}: ${used.size} colours (${[...used].join("")}), max ${MAX_FILL_COLOURS}`)
    return used
}

class Canvas {
    w: number
    h: number
    data: Uint8Array
    constructor(w: number, h: number, bg?: RGBA) {
        this.w = w
        this.h = h
        this.data = new Uint8Array(w * h * 4)
        if (bg) this.rect(0, 0, w, h, bg)
    }
    rect(x0: number, y0: number, w: number, h: number, c: RGBA) {
        for (let y = y0; y < y0 + h; y++)
            for (let x = x0; x < x0 + w; x++) this.data.set(c, (y * this.w + x) * 4)
    }
    sprite({ grid }: Sprite, x0: number, y0: number, scale: number) {
        grid.forEach((row, y) =>
            [...row].forEach((ch, x) => {
                const colour = PALETTE[ch]
                if (colour) this.rect(x0 + x * scale, y0 + y * scale, scale, scale, hex(colour))
            }),
        )
    }
    png() {
        return encodePNG(this.w, this.h, this.data)
    }
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
for (const sprite of SPRITES) {
    const used = validate(sprite)
    const canvas = new Canvas(OUT, OUT)
    canvas.sprite(sprite, 0, 0, OUT / SIZE)
    writeFileSync(join(root, "public/food", `${sprite.name}.png`), canvas.png())
    console.log(`${sprite.name}.png  fills: ${[...used].join("")}`)
}

const arg = (flag: string) => {
    const i = process.argv.indexOf(flag)
    return i > 0 ? process.argv[i + 1] : undefined
}

// Contact sheet: each background gets a band with the set at 1x, 2x, 4x and 6x.
const sheetPath = arg("--sheet")
if (sheetPath) {
    const backgrounds = ["#cdbcfc", "#18141f", "#f7f5ee"].map(hex)
    const scales = [1, 2, 4, 6]
    const pad = 12
    const bandH = pad + scales.reduce((sum, s) => sum + SIZE * s + pad, 0)
    const width = pad + SPRITES.length * (SIZE * 6 + pad)
    const sheet = new Canvas(width, bandH * backgrounds.length)
    backgrounds.forEach((bg, b) => {
        sheet.rect(0, b * bandH, width, bandH, bg)
        let y = b * bandH + pad
        for (const s of scales) {
            SPRITES.forEach((sprite, i) => sheet.sprite(sprite, pad + i * (SIZE * 6 + pad), y, s))
            y += SIZE * s + pad
        }
    })
    writeFileSync(sheetPath, sheet.png())
    console.log(`sheet -> ${sheetPath}`)
}

// Zoomed view with a pixel grid, for checking individual pixels.
const zoomPath = arg("--zoom")
if (zoomPath) {
    const z = 20
    const cell = SIZE * z
    const zoom = new Canvas(SPRITES.length * (cell + 8) + 8, cell + 16, hex("#cdbcfc"))
    SPRITES.forEach((sprite, i) => {
        const x0 = 8 + i * (cell + 8)
        zoom.sprite(sprite, x0, 8, z)
        for (let k = 0; k <= SIZE; k += 2) {
            const c: RGBA = k % 8 === 0 ? [255, 0, 255, 255] : [150, 130, 200, 255]
            zoom.rect(x0 + Math.min(k * z, cell - 1), 8, 1, cell, c)
            zoom.rect(x0, 8 + Math.min(k * z, cell - 1), cell, 1, c)
        }
    })
    writeFileSync(zoomPath, zoom.png())
    console.log(`zoom -> ${zoomPath}`)
}
