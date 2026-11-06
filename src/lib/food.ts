export interface Food {
    name: string
    icon: string
    /** The lowest GPA that can buy it. */
    price: number
}

// Cheapest first.
export const MENU: Food[] = [
    { name: "Ice", icon: "/food/ice.png", price: 0 },
    { name: "Bubble Tea", icon: "/food/bubble-tea.png", price: 2.5 },
    { name: "Chicken Rice", icon: "/food/chicken-rice.png", price: 3.5 },
    { name: "Nasi Lemak", icon: "/food/nasi-lemak.png", price: 4 },
    { name: "McSpicy", icon: "/food/mcspicy.png", price: 5 },
]

/** Compares the GPA as displayed, so the food always agrees with the figure on screen. */
export const foodFor = (gpa: number) => {
    const displayed = Math.round(gpa * 100) / 100
    return [...MENU].reverse().find(food => displayed >= food.price) ?? MENU[0]
}
