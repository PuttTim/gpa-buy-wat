import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export const ThemeToggle = () => {
    const { resolvedTheme, setTheme } = useTheme()
    const isDark = resolvedTheme === "dark"

    return (
        <Button
            variant="ghost"
            size="icon"
            className="hover:bg-primary-foreground/15 hover:text-primary-foreground dark:hover:bg-primary-foreground/15"
            aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
            onClick={() => setTheme(isDark ? "light" : "dark")}>
            {isDark ? <Sun /> : <Moon />}
        </Button>
    )
}
