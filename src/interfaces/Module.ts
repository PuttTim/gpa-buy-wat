import { PolyGrade, UniGrade } from "./Grade"

export interface Module {
    name: string
    grade: PolyGrade | UniGrade
    credits: number
}
