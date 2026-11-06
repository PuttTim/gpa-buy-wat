import { Module } from "./Module"

export interface Semester {
    name: string
    modules: Module[]
    collapsed?: boolean
}
