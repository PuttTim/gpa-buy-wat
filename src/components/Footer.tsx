import { Box, Center, Heading, Text } from "@chakra-ui/react"

export const Footer = () => {
    return (
        <Box bg="customGrey.500" maxW="auto" p="8px" mt="24px">
            <Center>
                <Text fontSize="lg" textAlign="center">
                    Created by{" "}
                    <a target="_blank" href="https://www.github.com/PuttTim">
                        <u>Putt</u>
                    </a>
                    ,{" "}
                    <a
                        target="_blank"
                        href="https://www.github.com/TechSupportz">
                        <u>Nitish</u>
                    </a>
                    ,{" "}
                    <a target="_blank" href="https://www.github.com/Coeeter">
                        <u>Nasrullah</u>
                    </a>{" "}
                    | view our repository here:{" "}
                    <a
                        target="_blank"
                        href="https://www.github.com/PuttTim/gpa-buy-wat">
                        <u>GitHub</u>
                    </a>
                </Text>
            </Center>
        </Box>
    )
}
