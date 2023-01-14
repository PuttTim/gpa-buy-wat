import {
    Accordion,
    AccordionButton,
    AccordionIcon,
    AccordionItem,
    AccordionPanel,
    Box,
    Button,
    Card,
    Heading,
    HStack,
    Input,
    NumberDecrementStepper,
    NumberIncrementStepper,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    VStack,
} from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { SelectSystem } from "../components/SelectSystem"
import { CalculationData } from "../interfaces/CalculationData"
import { PolyGrade, UniGrade } from "../interfaces/Grade"

const Calculator = () => {
    const [systemIndex, setSystemIndex] = useState(0)
    const [calculationData, setCalculationData] = useState<CalculationData>({
        currentGPA: 0,
        totalCredits: 0,
        groups: [
            {
                name: "Semester 1",
                modules: [
                    {
                        name: undefined,
                        credits: 0,
                        grade: systemIndex === 2 ? PolyGrade.A : UniGrade.A,
                    },
                ],
            },
        ],
    })

    useEffect(() => {
        console.log(calculationData, "calculationData")

        console.log(systemIndex, "systemIndex")
    }, [systemIndex, calculationData])

    return (
        <VStack spacing="16px" align="start">
            <Heading pt="8px">Select Grading System</Heading>
            <SelectSystem setIndex={setSystemIndex} />
            <Heading pt="8px">Current GPA & Credits</Heading>
            <HStack spacing="16px">
                <Input
                    w="50%"
                    placeholder="Current GPA"
                    type="number"
                    onChange={e => {
                        setCalculationData({
                            ...calculationData,
                            currentGPA: Number.isNaN(parseFloat(e.target.value))
                                ? 0
                                : parseFloat(e.target.value),
                        })
                    }}
                />
                <NumberInput
                    w="50%"
                    onChange={newValue => {
                        setCalculationData({
                            ...calculationData,
                            totalCredits: Number.isNaN(parseInt(newValue))
                                ? 0
                                : parseInt(newValue),
                        })
                    }}>
                    <NumberInputField placeholder="Total Credits" />
                    <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                    </NumberInputStepper>
                </NumberInput>
            </HStack>
            <Heading pt="16px">Calculate GPA</Heading>
            <Card
                w="100%"
                p="16px"
                bg="customGrey.100"
                borderColor="customGrey.900"
                variant="outline">
                <Accordion allowMultiple>
                    <AccordionItem border="none">
                        <>
                            <AccordionButton
                                bg="customIndigo.150"
                                borderRadius={8}
                                _hover={{ bg: "customIndigo.250" }}>
                                <Box as="span" flex="1" textAlign="left">
                                    Section 2 title
                                </Box>
                                <AccordionIcon />
                            </AccordionButton>
                        </>{" "}
                        <AccordionPanel bg="customGrey.100">
                            <Box w="200px" h="500px">
                                AAAAAa
                            </Box>
                        </AccordionPanel>
                    </AccordionItem>
                </Accordion>
            </Card>
            <Input placeholder={"Gibe GPA"} />
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
