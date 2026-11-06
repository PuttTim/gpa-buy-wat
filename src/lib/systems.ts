import { Grade, PolyGrade, SmuGrade, UniGrade } from "../interfaces/Grade"

export interface GradingSystem {
    name: string
    grades: Record<string, Grade>
    defaultGrade: Grade
    defaultCredits: number
    maxGPA: number
    gradingHelp: string
    /** Shown in the empty paste box. The local parser must read it without the AI. */
    pastePlaceholder: string
}

// Saved data and analytics refer to systems by position, so only ever append.
export const SYSTEMS: GradingSystem[] = [
    {
        name: "NUS",
        grades: { ...UniGrade, S: "S", U: "U", CS: "CS", CU: "CU" },
        defaultGrade: UniGrade["A+ / A"], defaultCredits: 4, maxGPA: 5,
        gradingHelp: "S/U and CS/CU don't affect GPA. A regular F counts as zero.",
        pastePlaceholder: "CS2030S A\nCS2040S A-\nMA1521: B+",
    },
    {
        name: "NTU",
        grades: { ...UniGrade, "P (Pass)": "P", "NR (No Record)": "NR", "Dabao / LOA": "LOA", "Fail (ungraded)": "ungraded-fail", "S (legacy)": "S", "U (legacy)": "U" },
        defaultGrade: UniGrade["A+ / A"], defaultCredits: 4, maxGPA: 5,
        gradingHelp: "Pass/No Record (FGO), Dabao / LOA, ungraded Pass/Fail and legacy S/U don't affect GPA. A regular F counts as zero.",
        pastePlaceholder: "SC1003 A\nSC1005 B+\nCC0001: P",
    },
    {
        name: "Poly",
        grades: { ...PolyGrade, "Pass (UP)": "UP", "Fail (UF)": "UF" },
        defaultGrade: PolyGrade.A, defaultCredits: 4, maxGPA: 4,
        gradingHelp: "Pass/Fail with no grade points don't affect GPA (UP/UF at SP). A regular F counts as zero.",
        pastePlaceholder: "ST0503 A\nST0507 B+\nLC0101: UP",
    },
    {
        name: "SMU",
        grades: { ...SmuGrade, Pass: "P", "Fail (ungraded)": "ungraded-fail" },
        defaultGrade: SmuGrade.A, defaultCredits: 1, maxGPA: 4,
        gradingHelp: "A+ is worth 4.3; cumulative GPA stops at 4.00. Pass (including Exploratory Courses) and ungraded Fail don't affect GPA. For a failure that counts towards GPA, use F.",
        pastePlaceholder: "IS111 A\nIS112 B+\nCOR1100: A-",
    },
]

/** Universities together, then Poly. */
export const TAB_ORDER = [0, 1, 3, 2]

const POLY_INDEX = 2
const POLY_PATHS = ["sp", "np", "tp", "nyp", "rp"]

/** The system a path like "/nus" or "/sp" preselects, if any. */
export const systemIndexFromPath = (pathname: string): number | null => {
    const path = pathname.replace(/^\/+|\/+$/g, "").toLowerCase()
    if (POLY_PATHS.includes(path)) return POLY_INDEX
    const index = SYSTEMS.findIndex(system => system.name.toLowerCase() === path)
    return index === -1 ? null : index
}

export const systemPath = (index: number) => `/${SYSTEMS[index].name.toLowerCase()}`
