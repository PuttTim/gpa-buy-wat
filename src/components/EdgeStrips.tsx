import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

const TOP = "--edge-top-background"
/** The colour token the top edge takes, matching the header. */
const TOP_COLOR = "--primary"

/** Resolves a colour token to plain sRGB, which every browser's theme-color accepts. */
const toRGB = (token: string) => {
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = 1
    const context = canvas.getContext("2d", { willReadFrequently: true })
    if (!context) return null
    context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
    context.fillRect(0, 0, 1, 1)
    const [r, g, b] = context.getImageData(0, 0, 1, 1).data
    return `rgb(${r} ${g} ${b})`
}

/**
 * Safari tints its status bar and bottom toolbar from what sits at the page's
 * edges. At the top, a thin fixed strip, the html background and the
 * theme-color tag all take the header's colour. The bottom strip always shows
 * the page background.
 */
export const EdgeStrips = () => {
    // Safari reads the strips' colours when they appear, and doesn't always notice
    // them change after. Bumping this re-creates them, so it reads them again.
    const [generation, setGeneration] = useState(0)

    useEffect(() => {
        const root = document.documentElement
        let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
        // Saved before anything here changes them, so leaving puts back exactly what was there.
        const originalTop = root.style.getPropertyValue(TOP)
        const originalThemeColor = meta?.content

        root.style.setProperty(TOP, `var(${TOP_COLOR})`)
        // theme-color can't follow a CSS variable, so it's resolved now and again
        // whenever the theme switches.
        const syncMeta = () => {
            const color = toRGB(TOP_COLOR)
            if (meta && color) meta.content = color
        }
        syncMeta()
        const themes = new MutationObserver(() => {
            // Safari can also miss a changed theme-color, so a fresh tag replaces it.
            if (meta) {
                const fresh = meta.cloneNode() as HTMLMetaElement
                meta.replaceWith(fresh)
                meta = fresh
            }
            syncMeta()
            setGeneration(current => current + 1)
        })
        themes.observe(root, { attributes: true, attributeFilter: ["class"] })

        return () => {
            themes.disconnect()
            if (originalTop) root.style.setProperty(TOP, originalTop)
            else root.style.removeProperty(TOP)
            if (meta && originalThemeColor !== undefined) meta.content = originalThemeColor
        }
    }, [])

    // In body, so no transformed ancestor can turn `fixed` into scrolling with the page.
    return createPortal(
        <>
            <div key={`top-${generation}`} aria-hidden="true" className="edge-top" />
            <div key={`bottom-${generation}`} aria-hidden="true" className="edge-bottom" />
        </>,
        document.body,
    )
}
