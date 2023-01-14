import React from "react"
import { Box } from "@chakra-ui/react"
import { Route, Routes } from "react-router-dom"
import Calculator from "./pages/Calculator"

const App = () => {
    return (
        <Box maxW="1500px" m="auto" px="16px">
            <Routes>
                <Route path="/" element={<Calculator />} />
            </Routes>
        </Box>
    )
}

export default App
