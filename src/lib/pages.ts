export const SITE_URL = "https://gpabuywhat.com"

export interface Page {
    path: string
    title: string
    description: string
}

const school = (slug: string, shortName: string, fullName: string): Page => ({
    path: `/${slug}`,
    title: `${shortName} GPA Calculator | GPA Buy What?`,
    description: `Calculate your GPA at ${fullName} and see what it can buy.`,
})

export const HOME_PAGE: Page = {
    path: "/",
    title: "GPA Buy What? | Singapore University & Polytechnic GPA Calculator",
    description: "Calculate your GPA and see what it can buy, whether you're from NUS, NTU, SMU or any poly.",
}

/** Each path gets its own prerendered HTML, so crawlers see distinct pages. Keep in step with systems.ts. */
export const SCHOOL_PAGES: Page[] = [
    school("nus", "NUS", "National University of Singapore (NUS)"),
    school("ntu", "NTU", "Nanyang Technological University (NTU)"),
    school("smu", "SMU", "Singapore Management University (SMU)"),
    school("poly", "Poly", "any poly in Singapore"),
    school("sp", "SP", "Singapore Polytechnic (SP)"),
    school("np", "NP", "Ngee Ann Polytechnic (NP)"),
    school("tp", "TP", "Temasek Polytechnic (TP)"),
    school("nyp", "NYP", "Nanyang Polytechnic (NYP)"),
    school("rp", "RP", "Republic Polytechnic (RP)"),
]

export const pageUrl = (page: Page) => `${SITE_URL}${page.path}`

export const pageTitleFor = (path: string) =>
    (SCHOOL_PAGES.find(page => page.path === path) ?? HOME_PAGE).title
