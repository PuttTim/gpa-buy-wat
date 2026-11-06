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

/** A module's credits, or null if it can't be one. */
const validCredits = (value: number | null) =>
    value !== null && Number.isFinite(value) && value > 0 && value <= 40 ? value : null

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
        const credits = validCredits(at === undefined ? null : Number(rest[at]))

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
    if (response.status === 503)
        throw new Error(
            "Smart reading has hit its limit for today. Lines like \"CS2030 A\" (code then grade) still work.",
        )
    if (!response.ok) throw new Error("Couldn't read that. Try one module per line, like \"CS2030 A\".")
    const { modules } = (await response.json()) as { modules: AIModule[] }

    const read = new Map(
        modules.map(module => {
            const grade = matchGrade(systemIndex, module.grade)
            // Unsure credits are usually guessed, not read, so the school's default is safer.
            const credits = module.creditsConfidence >= SURE ? validCredits(module.credits) : null
            // Written as "not sure enough" so a missing or odd confidence is flagged, not trusted.
            return [module.code, { grade, credits, unsure: grade === null || !(module.gradeConfidence >= SURE) }]
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
