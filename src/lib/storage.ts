import { CalculationData } from "../interfaces/CalculationData"
import { Module } from "../interfaces/Module"
import { Semester } from "../interfaces/Semester"
import { SYSTEMS, systemIndexFromPath } from "./systems"

const STORAGE_KEY = "gpa-buy-wat:v1"

export interface SavedState {
    systemIndex: number
    /** One set of data per grading system, so switching tabs never loses work. */
    systems: CalculationData[]
}

export const createModule = (systemIndex: number): Module => {
    const system = SYSTEMS[systemIndex]
    return {
        name: "",
        credits: system.defaultCredits,
        grade: system.defaultGrade,
    }
}

export const createCalculationData = (
    systemIndex: number,
): CalculationData => ({
    currentGPA: "",
    totalCredits: 0,
    semesters: [{ name: "Semester 1", modules: [createModule(systemIndex)] }],
})

export const MAX_CREDITS = 999

const toCount = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) && value > 0
        ? Math.min(value, MAX_CREDITS)
        : 0

const toGPA = (value: unknown, maxGPA: number) => {
    if (typeof value !== "string" || !/^\d*\.?\d*$/.test(value)) return ""
    return parseFloat(value) > maxGPA ? String(maxGPA) : value
}

const sanitizeModule = (raw: any, systemIndex: number): Module => {
    const fallback = createModule(systemIndex)
    const grades: string[] = Object.values(SYSTEMS[systemIndex].grades)
    return {
        name: typeof raw?.name === "string" ? raw.name : "",
        credits: toCount(raw?.credits),
        grade: grades.includes(raw?.grade) ? raw.grade : fallback.grade,
    }
}

const sanitizeSemester = (raw: any, systemIndex: number): Semester => ({
    name: typeof raw?.name === "string" ? raw.name : "Semester",
    collapsed: raw?.collapsed === true,
    modules: Array.isArray(raw?.modules)
        ? raw.modules.map((module: unknown) =>
              sanitizeModule(module, systemIndex),
          )
        : [],
})

export const sanitizeData = (raw: any, systemIndex: number): CalculationData => {
    if (!Array.isArray(raw?.semesters)) return createCalculationData(systemIndex)
    return {
        currentGPA: toGPA(raw.currentGPA, SYSTEMS[systemIndex].maxGPA),
        totalCredits: toCount(raw.totalCredits),
        semesters: raw.semesters.map((semester: unknown) =>
            sanitizeSemester(semester, systemIndex),
        ),
    }
}

export const loadState = (): SavedState => {
    let raw: any = null
    try {
        raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")
    } catch {
        // Unreadable or blocked storage: start fresh.
    }
    const systemIndex = raw?.systemIndex
    const savedIndex =
        Number.isInteger(systemIndex) &&
        systemIndex >= 0 &&
        systemIndex < SYSTEMS.length
            ? systemIndex
            : 0
    return {
        systemIndex: systemIndexFromPath(location.pathname) ?? savedIndex,
        systems: Array.from({ length: SYSTEMS.length }, (_, index) =>
            sanitizeData(raw?.systems?.[index], index),
        ),
    }
}

/** Returns false when the browser refused to store it (full or blocked). */
export const saveState = (state: SavedState) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
        return true
    } catch {
        return false
    }
}
