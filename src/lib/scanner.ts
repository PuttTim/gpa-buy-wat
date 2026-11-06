// Reads Code 39 from a camera. Uses the browser's own BarcodeDetector where it
// supports Code 39 (Chrome on Android and macOS), otherwise a WebAssembly
// reader that only downloads when someone opens the scanner.

interface Detector {
    detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>
}

declare global {
    interface Window {
        BarcodeDetector?: {
            new (options: { formats: string[] }): Detector
            getSupportedFormats(): Promise<string[]>
        }
    }
}

let detector: Promise<Detector> | null = null

export const getDetector = () =>
    (detector ??= (async () => {
        const native = window.BarcodeDetector
        if (native && (await native.getSupportedFormats()).includes("code_39"))
            return new native({ formats: ["code_39"] })

        const [{ BarcodeDetector, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([
            import("barcode-detector/ponyfill"),
            import("zxing-wasm/reader/zxing_reader.wasm?url"),
        ])
        // Served from our own domain instead of the package's default CDN.
        prepareZXingModule({
            overrides: { locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? wasmUrl : prefix + path) },
        })
        return new BarcodeDetector({ formats: ["code_39"] })
    })().catch(error => {
        detector = null
        throw error
    }))

/** The back camera on a phone, the webcam on a laptop. */
export const openCamera = () =>
    navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    })
