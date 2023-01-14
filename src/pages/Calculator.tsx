import { Button, Heading, Input } from "@chakra-ui/react"

const Calculator = () => {
    return (
        <>
            <Input placeholder="Hello gimme gpa" />
            <Heading>Bruh</Heading>
            <Button
                bg="hsla(234, 89%, 74%,0.25)"
                _hover={{ bg: "hsla(234, 89%, 74%,0.40)" }}
                _active={{ bg: "hsla(234, 89%, 74%,0.75)" }}>
                NUS
            </Button>
        </>
    )
}

export default Calculator
