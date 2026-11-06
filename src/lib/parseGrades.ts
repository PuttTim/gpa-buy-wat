import { Grade } from "../interfaces/Grade"
import { SYSTEMS } from "./systems"

// Reads pasted grades like "cs2030 a", "CS2100: A+" or a copied transcript row
// ("CS2040 Data Structures 4.00 A-"). Lines it can't finish are left for the
// AI fallback (worker/index.ts, /api/parse).

export interface ParsedModule {
    code: string
    grade: Grade | null
    credits: number | null
    /** Shown highlighted so the user checks it before importing. */
    unsure: boolean
}

export interface ParsedSemester {
    name: string
    modules: ParsedModule[]
}

export interface LocalParse {
    semesters: ParsedSemester[]
    /** Some module has no grade yet, or nothing was recognised at all. */
    needsAI: boolean
}

/** Module codes: NUS CS2030S, NTU SC1003, SMU IS111 or COR-STAT1202, Poly ST0503. Not "AY2024". */
export const MODULE_CODE = /\b(?!AY\d)(?:[A-Z]{2,4}-)?([A-Z]{2,4})\s?(\d{3,4})([A-Z]{0,2})\b/gi
const SEMESTER_LINE = /\b(sem(ester)?|term|trimester|year|ay)\b/i
const NUMBER = /^\d{1,2}(\.\d+)?$/
const CREDIT_UNIT = /^(AU|AUS|MC|MCS|CU|CUS|UNITS?|CREDITS?|CR)$/i
// Words in grade labels that describe a grade rather than name it.
const QUALIFIERS = new Set(["LEGACY", "UNGRADED"])

const compact = (text: string) => text.toUpperCase().replace(/\s+/g, "")

/** Every way a grade might be written for this school, mapped to its value. */
const gradeAliases = (systemIndex: number) => {
    const aliases = new Map<string, Grade>()
    const add = (alias: string, grade: Grade) => {
        if (alias && !aliases.has(alias)) aliases.set(alias, grade)
    }
    for (const [label, grade] of Object.entries(SYSTEMS[systemIndex].grades)) {
        add(compact(label), grade)
        for (const part of label.split(/[/()]/)) {
            const alias = compact(part)
            if (!QUALIFIERS.has(alias)) add(alias, grade)
        }
    }
    return aliases
}

/** "a", "A+", "b-", "Pass", "NR" -> this school's grade, or null. */
export const matchGrade = (systemIndex: number, text: string | null | undefined): Grade | null => {
    if (!text) return null
    const aliases = gradeAliases(systemIndex)
    const cleaned = compact(text).replace(/[.,;:]+$/, "")
    return aliases.get(cleaned) ?? aliases.get(compact(text.trim().split(/\s+/)[0])) ?? null
}

export const normaliseCode = (code: string) => code.toUpperCase().replace(/\s+/g, "")

export const parseLocally = (systemIndex: number, text: string): LocalParse => {
    const aliases = gradeAliases(systemIndex)
    const semesters: ParsedSemester[] = []
    let current: ParsedSemester | null = null
    let needsAI = false

    // ";" separates modules too: "IT1001 A; IT1002 B+".
    for (const line of text.split(/\r?\n|;/)) {
        const codes = [...line.matchAll(MODULE_CODE)]
        if (codes.length === 0) {
            const header = line.trim()
            if (header && header.length <= 40 && SEMESTER_LINE.test(header)) {
                current = { name: header, modules: [] }
                semesters.push(current)
            }
            continue
        }
        if (!current) {
            current = { name: "Semester 1", modules: [] }
            semesters.push(current)
        }
        // Several modules in one sentence ("A+ for SC1003, got B for SC1005"): which grade
        // goes with which code isn't safe to guess here, so the AI reads the line.
        if (codes.length > 1) {
            needsAI = true
            for (const code of codes)
                current.modules.push({ code: normaliseCode(code[0]), grade: null, credits: null, unsure: true })
            continue
        }
        const [match] = codes
        const rest = (line.slice(0, match.index) + " " + line.slice(match.index! + match[0].length))
            .split(/[\s,;:|]+/)
            .filter(Boolean)

        let grade: Grade | null = null
        // From the end, so a word in the module's title isn't taken as its grade.
        for (let i = rest.length - 1; i >= 0 && grade === null; i--) {
            if (!NUMBER.test(rest[i])) grade = aliases.get(compact(rest[i])) ?? null
        }
        // Credits: the number next to a unit word ("AU 3", "6 CU"), else the last number,
        // so a number in the title ("Mathematics 1") isn't taken.
        const numbered = rest.flatMap((token, i) => (NUMBER.test(token) ? [i] : []))
        const at =
            numbered.find(i => CREDIT_UNIT.test(rest[i - 1] ?? "")) ??
            numbered.find(i => CREDIT_UNIT.test(rest[i + 1] ?? "")) ??
            numbered.at(-1)
        const value = at === undefined ? null : Number(rest[at])
        const credits = value !== null && value > 0 && value <= 40 ? value : null

        if (grade === null) needsAI = true
        // "B+ (S/U)": the grade may not count, so let the user decide.
        const unsure = grade === null || /\bS\s*\/\s*U\b|\bSU'?d\b/i.test(line)
        current.modules.push({ code: normaliseCode(match[0]), grade, credits, unsure })
    }

    const found = semesters.filter(semester => semester.modules.length > 0)
    return { semesters: found, needsAI: needsAI || (found.length === 0 && text.trim() !== "") }
}

interface AIModule {
    code: string
    grade: string | null
    gradeConfidence: number
    credits: number | null
    creditsConfidence: number
}

/** Below this, a value the AI read is highlighted for the user to check. */
const SURE = 0.8

/** Fills in what the local parse couldn't, or reads free text with no module codes from scratch. */
export const parseWithAI = async (
    systemIndex: number,
    text: string,
    local: LocalParse,
): Promise<ParsedSemester[]> => {
    const known = local.semesters.flatMap(semester => semester.modules.map(module => module.code))
    const response = await fetch("/api/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, codes: known }),
    })
    if (response.status === 429) throw new Error("Too many tries. Wait a minute and try again.")
    if (!response.ok) throw new Error("Couldn't read that. Try one module per line, like \"CS2030 A\".")
    const { modules } = (await response.json()) as { modules: AIModule[] }

    const read = new Map(
        modules.map(module => {
            const grade = matchGrade(systemIndex, module.grade)
            // Unsure credits are usually guessed, not read, so the school's default is safer.
            const credits = module.creditsConfidence >= SURE ? module.credits : null
            return [module.code, { grade, credits, unsure: grade === null || module.gradeConfidence < SURE }]
        }),
    )

    // Keep the local semesters and what they already read; only fill the gaps.
    if (local.semesters.length > 0) {
        return local.semesters.map(semester => ({
            ...semester,
            modules: semester.modules.map(module => {
                const ai = read.get(module.code)
                if (module.grade !== null || !ai) return module
                return { ...module, grade: ai.grade, credits: module.credits ?? ai.credits, unsure: ai.unsure }
            }),
        }))
    }
    return modules.length === 0
        ? []
        : [{ name: "Semester 1", modules: modules.map(module => ({ code: module.code, ...read.get(module.code)! })) }]
}

// Reading an image mixes up look-alike characters. A code is letters, then 3 or 4
// digits, then up to two letters, so each part can be put back to the kind it must be.
const TO_LETTER: Record<string, string> = { "0": "O", "1": "I", "2": "Z", "5": "S", "6": "G", "8": "B", "€": "C", "$": "S" }
const SUFFIX_LETTER: Record<string, string> = { ...TO_LETTER, "8": "S" }
const TO_DIGIT: Record<string, string> = { O: "0", Q: "0", D: "0", I: "1", L: "1", "|": "1", Z: "2", S: "5", G: "6", B: "8" }
const STRICT_CODE = /^([A-Z]{2,4}-)?[A-Z]{2,4}\d{3,4}[A-Z]{0,2}$/

/** "1S1108" -> "IS1108", "CS12318" -> "CS1231S". Null when it can't be a code. */
const repairCode = (code: string) => {
    const upper = code.toUpperCase().replace(/\s+/g, "")
    if (STRICT_CODE.test(upper)) return upper
    for (const prefix of [2, 3, 4])
        for (const digits of [4, 3])
            for (const suffix of [0, 1, 2]) {
                if (prefix + digits + suffix !== upper.length) continue
                const chars = [...upper]
                const fixed =
                    chars.slice(0, prefix).map(c => TO_LETTER[c] ?? c).join("") +
                    chars.slice(prefix, prefix + digits).map(c => TO_DIGIT[c] ?? c).join("") +
                    chars.slice(prefix + digits).map(c => SUFFIX_LETTER[c] ?? c).join("")
                if (STRICT_CODE.test(fixed)) return fixed
            }
    return null
}

interface ImageModule extends AIModule {
    codeConfidence: number
}

/** Reads screenshots with Clairic. Every row it was unsure of, or had to repair, is flagged. */
export const parseImagesWithAI = async (systemIndex: number, images: string[]): Promise<ParsedSemester[]> => {
    const response = await fetch("/api/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ images }),
    })
    if (response.status === 429) throw new Error("Too many tries. Wait a minute and try again.")
    if (!response.ok) throw new Error("Couldn't read that image. Try a sharper screenshot, or paste the text.")
    const { modules } = (await response.json()) as { modules: ImageModule[] }

    const read = modules.flatMap(module => {
        const code = repairCode(module.code)
        if (!code && !module.grade) return []
        const grade = matchGrade(systemIndex, module.grade)
        return [{
            code: code ?? module.code,
            grade,
            credits: module.creditsConfidence >= SURE ? module.credits : null,
            unsure:
                !code ||
                code !== module.code ||
                grade === null ||
                module.codeConfidence < SURE ||
                module.gradeConfidence < SURE,
        }]
    })
    return read.length === 0 ? [] : [{ name: "Semester 1", modules: read }]
}

/** Clairic reads at most about a megapixel per image, so larger ones are shrunk first. */
const MAX_PIXELS = 1_000_000

export const imageToDataUrl = async (file: File) => {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, Math.sqrt(MAX_PIXELS / (bitmap.width * bitmap.height)))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext("2d")!
    context.fillStyle = "#fff"
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    // PNG keeps text edges sharp; fall back to JPEG if it's too big to send.
    const png = canvas.toDataURL("image/png")
    return png.length < 4_000_000 ? png : canvas.toDataURL("image/jpeg", 0.92)
}
