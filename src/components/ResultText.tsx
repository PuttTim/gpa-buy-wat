import { Heading, HStack, Text } from "@chakra-ui/react"
import React from "react"

interface ResultTextProps {
    header: string
    text: string
}

export const ResultText = (props: ResultTextProps) => {
    return (
        <>
            <Text fontSize="3xl" fontWeight="bold">
                {props.header}{" "}
                <span>
                    {" "}
                    <Text display="inline-block" fontWeight={300}>
                        {props.header === "Your GPA: "
                            ? parseFloat(props.text).toFixed(2)
                            : props.text}
                    </Text>
                </span>
            </Text>
        </>
    )
}
