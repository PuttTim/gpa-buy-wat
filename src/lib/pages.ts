export const SITE_URL = "https://gpabuywhat.com"

export interface Page {
    path: string
    title: string
    description: string
}

const TAGLINE = "Predict your next semester's GPA with a side of memes!"

const school = (slug: string, shortName: string, fullName: string): Page => ({
    path: `/${slug}`,
    title: `${shortName} GPA Calculator | GPA Buy What?`,
    description: `GPA calculator for ${fullName} students. ${TAGLINE}`,
})

export const HOME_PAGE: Page = {
    path: "/",
    title: "GPA Buy What? | Singapore University & Polytechnic GPA Calculator",
    description: `GPA calculator for universities and polytechnics in Singapore. ${TAGLINE}`,
}

/** Each path gets its own prerendered HTML, so crawlers see distinct pages. Keep in step with systems.ts. */
export const SCHOOL_PAGES: Page[] = [
    school("nus", "NUS", "National University of Singapore (NUS)"),
    school("ntu", "NTU", "Nanyang Technological University (NTU)"),
    school("smu", "SMU", "Singapore Management University (SMU)"),
    school("poly", "Poly", "Singapore polytechnic"),
    school("sp", "SP", "Singapore Polytechnic (SP)"),
    school("np", "NP", "Ngee Ann Polytechnic (NP)"),
    school("tp", "TP", "Temasek Polytechnic (TP)"),
    school("nyp", "NYP", "Nanyang Polytechnic (NYP)"),
    school("rp", "RP", "Republic Polytechnic (RP)"),
]

export const pageUrl = (page: Page) => `${SITE_URL}${page.path}`

export const pageTitleFor = (path: string) =>
    (SCHOOL_PAGES.find(page => page.path === path) ?? HOME_PAGE).title
