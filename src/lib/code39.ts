// Code 39: nine elements per character, alternating bar and space, 1 = wide.
const PATTERNS: Record<string, string> = {
    "0": "000110100", "1": "100100001", "2": "001100001", "3": "101100000",
    "4": "000110001", "5": "100110000", "6": "001110000", "7": "000100101",
    "8": "100100100", "9": "001100100", A: "100001001", B: "001001001",
    C: "101001000", D: "000011001", E: "100011000", F: "001011000",
    G: "000001101", H: "100001100", I: "001001100", J: "000011100",
    K: "100000011", L: "001000011", M: "101000010", N: "000010011",
    O: "100010010", P: "001010010", Q: "000000111", R: "100000110",
    S: "001000110", T: "000010110", U: "110000001", V: "011000001",
    W: "111000000", X: "010010001", Y: "110010000", Z: "011010000",
    "-": "010000101", ".": "110000100", " ": "011000100", "*": "010010100",
}

const WIDE = 3

/** The bars as [start, width] in modules, with the total width in modules. */
export const encodeCode39 = (value: string) => {
    const bars: [number, number][] = []
    let x = 0
    for (const character of `*${value.toUpperCase()}*`) {
        const pattern = PATTERNS[character]
        if (!pattern) continue
        for (let i = 0; i < pattern.length; i++) {
            const width = pattern[i] === "1" ? WIDE : 1
            if (i % 2 === 0) bars.push([x, width])
            x += width
        }
        x += 1 // Gap between characters.
    }
    return { bars, width: x - 1 }
}
