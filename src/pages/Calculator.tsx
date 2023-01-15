import {
    Accordion,
    AccordionButton,
    AccordionIcon,
    AccordionItem,
    AccordionPanel,
    Box,
    Button,
    Card,
    Center,
    Editable,
    Heading,
    HStack,
    Icon,
    IconButton,
    Input,
    NumberDecrementStepper,
    NumberIncrementStepper,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    Select,
    VStack,
} from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { Edit3, Trash2 } from "react-feather"
import { SelectSystem } from "../components/SelectSystem"
import { CalculationData } from "../interfaces/CalculationData"
import { PolyGrade, UniGrade } from "../interfaces/Grade"
import { Group } from "../interfaces/Group"

const Calculator = () => {
    const [systemIndex, setSystemIndex] = useState(0)
    const [gpa, setGpa] = useState(0)
    const [totalCredits, setTotalCredits] = useState(0)
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
                    {
                        name: undefined,
                        credits: 4,
                        grade: systemIndex === 2 ? PolyGrade.A : UniGrade.A,
                    },
                    {
                        name: undefined,
                        credits: 5,
                        grade: systemIndex === 2 ? PolyGrade.A : UniGrade.A,
                    },
                ],
            },
        ],
    })

    const calculateTotalCredits = (groups: Group[]) => {
        return groups.reduce((prev, group) => {
            return (
                group.modules.reduce(
                    (prev, module) => module.credits + prev,
                    0,
                ) + prev
            )
        }, 0)
    }

    const calculateCumulativeGPA = (groups: Group[]) => {
        let totalCredits = 0
        let totalGrade = 0
        groups.forEach(group => {
            group.modules.forEach(module => {
                totalCredits += module.credits
                totalGrade += parseFloat(module.grade) * module.credits
            })
        })
        return totalGrade / totalCredits
    }

    const calculateGPAPerGroup = (groups: Group[]) => {
        return groups.map(group => {
            let totalCredits = 0
            let totalGrade = 0
            group.modules.forEach(module => {
                totalCredits += module.credits
                totalGrade += parseFloat(module.grade) * module.credits
            })
            return {
                ...group,
                gpa: totalGrade / totalCredits,
            }
        })
    }

    useEffect(() => {
        console.log(calculationData, "calculationData")

        console.log(systemIndex, "systemIndex")

        console.log(Object.keys(UniGrade))
        console.log(Object.values(UniGrade))
    }, [systemIndex, calculationData])

    useEffect(() => {
        setGpa(calculateCumulativeGPA(calculationData.groups))
        setTotalCredits(calculateTotalCredits(calculationData.groups))
    }, [calculationData, systemIndex])

    return (
        <VStack spacing="16px" align="start">
            <Heading pt="8px" fontSize="3xl">
                Select Grading System
            </Heading>
            <SelectSystem setIndex={setSystemIndex} />
            <Heading pt="8px" fontSize="3xl">
                Current GPA & Credits
            </Heading>
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
            <Heading pt="16px" fontSize="3xl">
                Calculate GPA
            </Heading>
            <Card
                w="100%"
                p="16px"
                bg="customGrey.100"
                borderColor="customGrey.900"
                variant="outline">
                <Accordion allowMultiple defaultValue={1}>
                    <AccordionItem border="none">
                        <AccordionButton
                            py="8px"
                            px="12px"
                            bg="customIndigo.150"
                            borderRadius={8}
                            _hover={{ bg: "customIndigo.250" }}
                            _active={{ bg: "customIndigo.150" }}>
                            <HStack w="100%" justifyContent="space-between">
                                <Center gap="8px">
                                    <IconButton
                                        variant="unstyled"
                                        size="xs"
                                        onClick={() => {
                                            console.log(
                                                "edit group name clicked",
                                            )
                                        }}
                                        icon={<Edit3 />}
                                        m={0}
                                        aria-label={""}
                                    />
                                    <Heading fontSize="2xl" fontWeight="medium">
                                        Semester 1
                                    </Heading>
                                </Center>
                                <Center gap="8px">
                                    <Heading fontSize="2xl" fontWeight="medium">
                                        3.95
                                    </Heading>
                                    <AccordionIcon />
                                </Center>
                            </HStack>
                        </AccordionButton>

                        <AccordionPanel bg="customGrey.100">
                            <Box w="100%" h="auto" mb="16px">
                                Enter Module Name
                                <HStack gap="8px" justifyContent="space-around">
                                    <Select
                                        onChange={e => {
                                            console.log(e.target.value)
                                        }}>
                                        {systemIndex === 2
                                            ? Object.keys(PolyGrade).map(
                                                  (key, index) => (
                                                      <option
                                                          key={index}
                                                          value={
                                                              PolyGrade[
                                                                  key as keyof typeof PolyGrade
                                                              ]
                                                          }>
                                                          {key}
                                                      </option>
                                                  ),
                                              )
                                            : Object.keys(UniGrade).map(
                                                  (key, index) => (
                                                      <option
                                                          key={index}
                                                          value={
                                                              UniGrade[
                                                                  key as keyof typeof UniGrade
                                                              ]
                                                          }>
                                                          {key}
                                                      </option>
                                                  ),
                                              )}
                                    </Select>
                                    <Input type="number" />
                                    <IconButton
                                        bg="customRed.100"
                                        variant="solid"
                                        p="8px"
                                        size="md"
                                        _hover={{ bg: "customRed.500" }}
                                        _active={{ bg: "customRed.100" }}
                                        icon={<Trash2 />}
                                        aria-label={""}></IconButton>
                                </HStack>
                            </Box>
                            <Box w="100%" h="autopx">
                                Enter Module Name
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
