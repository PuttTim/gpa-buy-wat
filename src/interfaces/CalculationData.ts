import { Group } from "./Group"
import { Module } from "./Module"

export interface CalculationData {
    currentGPA: number
    totalCredits: number
    groups: Group[]
}
