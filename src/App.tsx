import React from "react"
import { Box, Center, Heading } from "@chakra-ui/react"
import { Route, Routes } from "react-router-dom"
import Calculator from "./pages/Calculator"
import Header from "./components/Header"
import { Footer } from "./components/Footer"

const App = () => {
    return (
        <>
            <Header />
            <Box maxW="1400px" m="auto" px="16px" mb="32px">
                <Routes>
                    <Route path="/" element={<Calculator />} />
                </Routes>
            </Box>
            <Footer />
        </>
    )
}

export default App
