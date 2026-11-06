export enum UniGrade {
    "A+ / A" = "5",
    "A-" = "4.5",
    "B+" = "4",
    "B" = "3.5",
    "B-" = "3",
    "C+" = "2.5",
    "C" = "2",
    "C-" = "1.5",
    "D+" = "1",
    "D" = "0.5",
    "F" = "0",
}

export enum PolyGrade {
    "A" = "4",
    "B+" = "3.5",
    "B" = "3",
    "C+" = "2.5",
    "C" = "2",
    "D+" = "1.5",
    "D" = "1",
    "D- / E" = "0.5",
    "F" = "0",
}

export enum SmuGrade {
    "A+" = "4.3",
    "A" = "4",
    "A-" = "3.7",
    "B+" = "3.3",
    "B" = "3",
    "B-" = "2.7",
    "C+" = "2.3",
    "C" = "2",
    "C-" = "1.7",
    "D+" = "1.3",
    "D" = "1",
    "F" = "0",
}

/** Non-numeric results never contribute grade points or GPA credits. */
export type UngradedGrade = "S" | "U" | "CS" | "CU" | "P" | "NR" | "LOA" | "UP" | "UF" | "ungraded-fail"

export type Grade = PolyGrade | SmuGrade | UniGrade | UngradedGrade
