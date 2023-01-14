import { Box, Button, Heading, Input, VStack } from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { SelectSystem } from "../components/SelectSystem"

const Calculator = () => {
    const [systemIndex, setSystemIndex] = useState(0)

    useEffect(() => {
        console.log(systemIndex)
    }, [systemIndex])

    return (
        <VStack spacing="24px" align="start">
            <Heading>Select Grading System</Heading>
            <SelectSystem setIndex={setSystemIndex} />
            <Input placeholder={"Gibe GPA"} />
            <Heading>Bruh</Heading>
            <Button
                bg="hsla(234, 89%, 74%,0.25)"
                _hover={{ bg: "hsla(234, 89%, 74%,0.40)" }}
                _active={{ bg: "hsla(234, 89%, 74%,0.75)" }}>
                NUS
            </Button>
        </VStack>
    )
}

export default Calculator
