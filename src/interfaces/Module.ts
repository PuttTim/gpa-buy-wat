import { PolyGrade, UniGrade } from "./Grade"

export interface Module {
    name: string | undefined
    grade: PolyGrade | UniGrade
    credits: number
}
