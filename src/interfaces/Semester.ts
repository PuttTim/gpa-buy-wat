import { Module } from "./Module"

export interface Semester {
    name: string
    modules: Module[]
    collapsed?: boolean
    /** Shown as plain text, so finished semesters can't be changed by accident. */
    locked?: boolean
}
