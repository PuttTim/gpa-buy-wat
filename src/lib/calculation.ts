import { Module } from "../interfaces/Module"
import { Semester } from "../interfaces/Semester"

export const creditsIn = (modules: Module[]) =>
    modules.reduce((total, module) => total + module.credits, 0)

/** Ungraded results are excluded from both sides of the weighted average. */
export const calculateGPA = (modules: Module[], maxGPA = Infinity) => {
    let credits = 0
    let points = 0
    modules.forEach(module => {
        const gradePoints = Number(module.grade)
        if (!Number.isFinite(gradePoints)) return
        credits += module.credits
        points += gradePoints * module.credits
    })
    return credits > 0 ? Math.min(points / credits, maxGPA) : null
}

/** Weight capped semester GPAs by GPA-bearing credits, excluding ungraded courses. */
export const calculateCumulativeGPA = (semesters: Semester[], maxGPA: number) => {
    let credits = 0
    let points = 0
    semesters.forEach(semester => {
        const gpa = calculateGPA(semester.modules, maxGPA)
        if (gpa === null) return
        const gradedCredits = creditsIn(semester.modules.filter(module => Number.isFinite(Number(module.grade))))
        credits += gradedCredits
        points += gpa * gradedCredits
    })
    return credits > 0 ? Math.min(points / credits, maxGPA) : null
}
