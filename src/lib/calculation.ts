import { Module } from "../interfaces/Module"

export const creditsIn = (modules: Module[]) =>
    modules.reduce((total, module) => total + module.credits, 0)

/** Ungraded results are excluded from both sides of the weighted average. */
export const calculateGPA = (modules: Module[], startCredits = 0, startGPA = 0) => {
    let credits = startCredits
    let points = startGPA * startCredits
    modules.forEach(module => {
        const gradePoints = Number(module.grade)
        if (!Number.isFinite(gradePoints)) return
        credits += module.credits
        points += gradePoints * module.credits
    })
    return credits > 0 ? points / credits : null
}
