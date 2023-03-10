import React from "react"
import { Box, Center, Heading } from "@chakra-ui/react"
import { Route, Routes } from "react-router-dom"
import Calculator from "./pages/Calculator"

const App = () => {
    return (
        <>
            <Box bg="customGrey.500" w="auto" p="8px" mb="24px">
                <Center>
                    <Heading>GPA buy wat?</Heading>
                </Center>
            </Box>
            <Box maxW="1400px" m="auto" px="16px" mb="64px">
                <Routes>
                    <Route path="/" element={<Calculator />} />
                </Routes>
            </Box>
        </>
    )
}

export default App
