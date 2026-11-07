/**
 * Renders the marketing graphics from their HTML sources in scripts/graphics/
 * with headless Chrome. Run after changing the food sprites:
 *
 *   node scripts/export-sprites.ts && node scripts/render-graphics.ts
 *
 * Set CHROME to the Chrome binary if it isn't in the default macOS location.
 */
import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
const root = join(dirname(fileURLToPath(import.meta.url)), "..")

const GRAPHICS = [
    // The OG card is served as-is, so it renders at 1x and stays opaque.
    { source: "og-image.html", out: "public/og-image.png", width: 1200, height: 630, scale: 1 },
    // The README graphic has rounded, transparent corners and renders at 2x.
    { source: "feature-graphic.html", out: "docs/feature-graphic.png", width: 1200, height: 800, scale: 2 },
]

const profile = mkdtempSync(join(tmpdir(), "render-graphics-"))
try {
    for (const { source, out, width, height, scale } of GRAPHICS) {
        execFileSync(
            CHROME,
            [
                "--headless=new",
                "--disable-gpu",
                "--hide-scrollbars",
                "--allow-file-access-from-files",
                `--user-data-dir=${profile}`,
                `--window-size=${width},${height}`,
                `--force-device-scale-factor=${scale}`,
                "--default-background-color=00000000",
                "--virtual-time-budget=3000",
                `--screenshot=${join(root, out)}`,
                pathToFileURL(join(root, "scripts/graphics", source)).href,
            ],
            { stdio: "ignore" },
        )
        console.log(`${out}  ${width * scale}x${height * scale}`)
    }
} finally {
    rmSync(profile, { recursive: true, force: true })
}
