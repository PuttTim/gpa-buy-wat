// Sounds made on the fly as tiny WAVs, played through <audio> so iOS plays them.

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
/** A square wave's first two harmonics: a fryer's buzzy piezo without the harsh edge. */
const piezo = (phase: number) => sine(phase) + sine(3 * phase) / 3

/** A soft checkout beep, a short pause, then a quick classic-scanner beep. */
const BEEP: Tone[] = [
    { hz: 1800, seconds: 0.12, wave: sine, level: 0.3, gap: 0.03 },
    { hz: 2650, seconds: 0.06, wave: triangle, level: 0.24 },
]

/** One "fries done" burst from a fry-station timer: five quick beeps alternating high and low. */
const FRIES_DONE: Tone[] = [1500, 1000, 1500, 1000, 1500].map((hz, i, all) => ({
    hz,
    seconds: 0.1,
    wave: piezo,
    level: 0.20,
    gap: i < all.length - 1 ? 0.04 : 0,
}))

let beepUrl: string | null = null
let friesUrl: string | null = null

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
            pcm.push(
                Math.round(
                    tone.wave((tone.hz * i) / SAMPLE_RATE) *
                        envelope *
                        tone.level *
                        32767,
                ),
            )
        }
        for (let i = Math.round(SAMPLE_RATE * (tone.gap ?? 0)); i > 0; i--)
            pcm.push(0)
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

/** Call from the tap that finishes an import, so iOS lets it play. */
export const playFriesDone = () => {
    new Audio((friesUrl ??= makeWav(FRIES_DONE))).play().catch(() => {})
}
