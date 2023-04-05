import {
    Box,
    Center,
    Heading,
    HStack,
    Icon,
    IconButton,
    Text,
    Tooltip,
    VStack,
} from "@chakra-ui/react"
import React from "react"
import { GitHub } from "react-feather"

const Footer = () => {
    return (
        <VStack
            h="100%"
            minH="10vh"
            position="sticky"
            bgColor="customGrey.500"
            w="100%"
            px={8}
            py={4}
            justifyContent="center">
            <Heading
                textAlign="center"
                size={{
                    base: "sm",
                    md: "md",
                }}>
                <span>
                    <Tooltip label="Project was originally made for NUS Hackers' Hack&Roll 2023!">
                        <Heading
                            size={{
                                base: "sm",
                                md: "md",
                            }}
                            display="inline-block"
                            textDecoration="dotted">
                            Project
                        </Heading>
                    </Tooltip>
                </span>{" "}
                made with ❤️ by{" "}
                <span>
                    <a href="https://github.com/PuttTim" target="_blank">
                        <Text display="inline-block" textDecoration="underline">
                            PuttTim
                        </Text>
                    </a>
                </span>
                {", "}
                <span>
                    <a href="https://github.com/TechSupportz" target="_blank">
                        <Text display="inline-block" textDecoration="underline">
                            TechSupportz
                        </Text>
                    </a>
                </span>
                {", "}
                <span>
                    <a href="https://github.com/Coeeter/" target="_blank">
                        <Text display="inline-block" textDecoration="underline">
                            Coeeter
                        </Text>
                    </a>
                </span>
            </Heading>
            <a href="https://github.com/PuttTim/gpa-buy-wat" target="_blank">
                <HStack>
                    <Icon>
                        <GitHub />
                    </Icon>
                    <Text
                        fontSize={{
                            base: "sm",
                            md: "md",
                        }}>
                        Project repository on{" "}
                        <span>
                            <Text
                                display="inline-block"
                                textDecoration="underline">
                                GitHub
                            </Text>
                        </span>
                    </Text>
                </HStack>
            </a>
        </VStack>
    )
}

export default Footer
