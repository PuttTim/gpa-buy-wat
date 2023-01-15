import { Heading, HStack, Text } from "@chakra-ui/react"
import React from "react"

interface ResultTextProps {
    header: string
    text: string | GLfloat | number
}

export const ResultText = (props: ResultTextProps) => {
    return (
        <HStack align="center">
            <Heading>{props.header}</Heading>
            <Text fontSize="3xl" fontWeight="medium">
                {props.text}
            </Text>
        </HStack>
    )
}
