import "@fontsource/manrope/400.css"
import "@fontsource/manrope/500.css"
import "@fontsource/manrope/600.css"
import { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"
import { initAnalytics } from "./lib/analytics"

initAnalytics()

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
