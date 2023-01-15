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
        customRed: {
            100: "#8f3c3c",
            500: "#FF5959",
        },
        customGrey: {
            100: "#1f1f1f",
            500: "#282828",
            900: "#343434",
        },
        customWhite: {
            100: "#e6e6e6",
        },
        customIndigo: {
            150: "#2e2f40",
            250: "#3e425d",
            500: "#545a91",
        },
    },
    components: {
        Input: {
            defaultProps: {
                variant: "filled",
                focusBorderColor: "customIndigo.500",
            },
        },
        NumberInput: {
            defaultProps: {
                variant: "filled",
                focusBorderColor: "customIndigo.500",
            },
        },
        Select: {
            defaultProps: {
                variant: "filled",
                focusBorderColor: "customIndigo.500",
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
