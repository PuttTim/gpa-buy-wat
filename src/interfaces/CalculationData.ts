import { Semester } from "./Semester"

export interface CalculationData {
    /** Kept as typed so partial values like "4." survive while editing. */
    currentGPA: string
    totalCredits: number
    semesters: Semester[]
}
