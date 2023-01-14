import { color, extendTheme, type ThemeConfig } from "@chakra-ui/react"

const theme: ThemeConfig = extendTheme({
    config: {
        initialColorMode: "dark",
        useSystemColorMode: false,
    },
    styles: {
        global: {
            body: {
                bg: "#1f1f1f",
            },
        },
    },
    fonts: {
        heading: `'Poppins', sans-serif`,
        body: `'DM Sans', sans-serif`,
    },
    colors: {
        accent: {
            100: "#8e98f9",
            200: "#818cf8",
            300: "#747edf",
            400: "#6770c6",
            500: "#5a62ae",
            600: "#4d5495",
            700: "#41467c",
            800: "#343863",
            900: "#272a4a",
        },
        red: {
            400: "#FF5959",
        },
    },
    components: {
        Input: {
            defaultProps: {
                variant: "filled",
            },
        },
        Heading: {
            baseStyle: {
                fontWeight: "semibold",
            },
        },
       
    },
})

export default theme
