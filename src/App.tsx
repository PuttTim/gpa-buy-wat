import React from "react"
import { Box, Center, Heading, Text } from "@chakra-ui/react"
import { Route, Routes } from "react-router-dom"
import Calculator from "./pages/Calculator"
import ReactGA from "react-ga4"
import Footer from "./components/Footer"

const App = () => {
    ReactGA.initialize("G-YDGEVRERT0")
    ReactGA.send({
        hitType: "pageview",
        page: "GPA Buy Wat? | Singapore University & Polytechnic GPA Calculator",
    })

    return (
        <>
            <Box minH="90vh">
                <Box bg="customGrey.500" w="auto" px={8} mb={4} py={4}>
                    <Center>
                        <Heading>GPA buy wat?</Heading>
                    </Center>
                </Box>
                <Box maxW="1400px" m="auto" px="16px" pb={8}>
                    <Routes>
                        <Route path="/" element={<Calculator />} />
                    </Routes>
                </Box>
            </Box>

            <Footer />
        </>
    )
}

export default App
