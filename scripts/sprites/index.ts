import bubbleTea from "./bubble-tea.ts"
import chickenRice from "./chicken-rice.ts"
import ice from "./ice.ts"
import mcspicy from "./mcspicy.ts"
import nasiLemak from "./nasi-lemak.ts"

export interface Sprite {
    /** Output filename in public/food/, without .png. */
    name: string
    /** 16 rows of 16 characters, one per pixel, keyed by PALETTE. */
    grid: string[]
}

// Menu order, cheapest first.
export const SPRITES: Sprite[] = [ice, bubbleTea, chickenRice, nasiLemak, mcspicy]
