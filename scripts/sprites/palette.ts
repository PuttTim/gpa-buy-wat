/**
 * The shared palette for the food sprites, one character per colour. Colours
 * follow the original set: flat fills, one darker step for the side away from
 * the top-left light, and a tinted outline (brown for food, navy for ice).
 */
export const PALETTE: Record<string, string | null> = {
    ".": null, // transparent

    K: "#3a1a0b", // outline: food
    N: "#012f53", // outline: ice

    W: "#fffbf2", // white: rice, egg white
    C: "#fce9bc", // cream: cup lid, sesame
    F: "#b4b6b6", // plate grey

    I: "#98fafb", // ice top
    i: "#92ccfa", // ice lit side
    j: "#4fa1f5", // ice shaded side

    B: "#a25c3d", // tea brown, straw
    b: "#7d4329", // tea brown shade
    T: "#dfab76", // milk tea
    t: "#c48d58", // milk tea shade

    S: "#f9d7a5", // chicken meat
    H: "#c8742a", // roast chicken skin
    h: "#8a4a1a", // roast chicken shade

    Y: "#fcb902", // yolk

    L: "#2f7b18", // banana leaf
    l: "#215a10", // banana leaf shade
    R: "#c21313", // sambal
    r: "#8f0c0c", // sambal shade

    P: "#d99c00", // bun
    p: "#a87400", // bun shade
    G: "#3dbc01", // lettuce
    g: "#2a8a00", // lettuce shade
    O: "#c84707", // patty
    o: "#7e2f01", // patty shade
}
