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
        <Box>
            <Box bg="customGrey.500" minH="5vh" w="auto" p="8px" mb="24px">
                <Center>
                    <Heading>GPA buy wat?</Heading>
                </Center>
            </Box>
            <Box maxW="1400px" minH="75vh" m="auto" px="16px" mb="64px">
                <Routes>
                    <Route path="/" element={<Calculator />} />
                </Routes>
            </Box>
            <Footer />
        </Box>
    )
}

export default App
