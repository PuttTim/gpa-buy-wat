import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/sonner"
import Footer from "./components/Footer"
import Calculator from "./pages/Calculator"

const App = () => (
    <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange>
        <div className="flex min-h-dvh flex-col bg-background">
            <div className="flex-1">
                <Calculator />
            </div>
            <Footer />
        </div>
        <Toaster mobileOffset={{ bottom: 64 }} />
    </ThemeProvider>
)

export default App
