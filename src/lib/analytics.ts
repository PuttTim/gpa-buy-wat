import ReactGA from "react-ga4"

// Production only, so local development doesn't count as real traffic.
const enabled = import.meta.env.PROD

export const initAnalytics = () => {
    if (!enabled) return
    ReactGA.initialize("G-YDGEVRERT0")
    ReactGA.send({
        hitType: "pageview",
        page: "GPA Buy What? | Singapore University & Polytechnic GPA Calculator",
    })
}

export const trackSystemSelected = (system: string) => {
    if (!enabled) return
    ReactGA.event("select_system", { system })
}
