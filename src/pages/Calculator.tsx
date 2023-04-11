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
    EditableInput,
    EditablePreview,
    FormControl,
    FormLabel,
    Heading,
    HStack,
    IconButton,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    NumberDecrementStepper,
    NumberIncrementStepper,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    Select,
    useDisclosure,
    VStack,
} from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { Edit3, Trash2 } from "react-feather"
import { ResultText } from "../components/ResultText"
import { SelectSystem } from "../components/SelectSystem"
import { CalculationData } from "../interfaces/CalculationData"
import { PolyGrade, UniGrade } from "../interfaces/Grade"
import { Group } from "../interfaces/Group"
import { Module } from "../interfaces/Module"

const Calculator = () => {
    const [systemIndex, setSystemIndex] = useState(0)
    const [resultGPA, setResultGPA] = useState(0)
    const [resultTotalCredits, setResultTotalCredits] = useState(0)
    const [resultFood, setResultFood] = useState("")
    const baseCalculationData: CalculationData = {
        currentGPA: 0,
        totalCredits: 0,
        groups: [
            {
                name: "Semester 1",
                modules: [
                    {
                        name: "Enter Module Name",
                        credits: 4,
                        grade:
                            systemIndex === 2
                                ? PolyGrade.A
                                : UniGrade["A+ / A"],
                    },
                ],
            },
        ],
    }
    const [calculationData, setCalculationData] =
        useState<CalculationData>(baseCalculationData)
    const { isOpen, onOpen, onClose } = useDisclosure()
    const [groupName, setGroupName] = useState("Semester ?")

    const defaultModuleValues: Module = {
        grade: systemIndex == 2 ? PolyGrade.A : UniGrade["A+ / A"],
        credits: 4,
        name: "Enter Module Name",
    }

    const calculateTotalCredits = (calculationData: CalculationData) => {
        return calculationData.groups.reduce((prev, group) => {
            return (
                group.modules.reduce(
                    (prev, module) => module.credits + prev,
                    0,
                ) + prev
            )
        }, calculationData.totalCredits)
    }

    const calculateCumulativeGPA = (calculationData: CalculationData) => {
        let totalCredits = calculationData.totalCredits
        let totalGrade =
            calculationData.currentGPA * calculationData.totalCredits
        calculationData.groups.forEach(group => {
            group.modules.forEach(module => {
                totalCredits += module.credits
                totalGrade += parseFloat(module.grade) * module.credits
            })
        })
        return totalGrade / totalCredits
    }

    const calculateFood = (gpa: number) => {
        if (gpa === 5) {
            return "McSpicy 🍔"
        } else if (gpa >= 4) {
            return "Nasi Lemak 🍚"
        } else if (gpa >= 3.5) {
            return "Chicken Rice 🍗"
        } else if (gpa >= 2.5) {
            return "Bubble Tea 🧋"
        }

        return "Water 💧"
    }

    const calculateGPAPerGroup = (group: Group) => {
        let totalCredits = 0
        let totalGrade = 0
        group.modules.forEach(module => {
            totalCredits += module.credits
            totalGrade += parseFloat(module.grade) * module.credits
        })
        return totalGrade / totalCredits
    }

    useEffect(() => {
        setCalculationData(baseCalculationData)
    }, [systemIndex])

    useEffect(() => {
        console.log(calculationData, "calculationData")
        // console.log(systemIndex, "systemIndex")
        // console.log(Object.keys(UniGrade))
        // console.log(Object.values(UniGrade))
    }, [systemIndex, calculationData])

    const updateModuleGrade = (
        points: string,
        groupIndex: number,
        moduleIndex: number,
    ) => {
        // console.log(points, groupIndex, moduleIndex)
        const calculationData_copy = JSON.parse(JSON.stringify(calculationData))

        calculationData_copy.groups[groupIndex].modules[moduleIndex].grade =
            points

        setCalculationData(calculationData_copy)
    }

    const updateModuleCredits = (
        credits: string,
        groupIndex: number,
        moduleIndex: number,
    ) => {
        const calculationData_copy = JSON.parse(JSON.stringify(calculationData))

        calculationData_copy.groups[groupIndex].modules[moduleIndex].credits =
            parseInt(credits)

        setCalculationData(calculationData_copy)
    }

    const updateModuleName = (
        name: string,
        groupIndex: number,
        moduleIndex: number,
    ) => {
        const calculationData_copy = JSON.parse(JSON.stringify(calculationData))

        calculationData_copy.groups[groupIndex].modules[moduleIndex].name = name

        setCalculationData(calculationData_copy)
    }

    const deleteModule = (groupIndex: number, moduleIndex: number) => {
        const calculationData_copy = JSON.parse(JSON.stringify(calculationData))

        calculationData_copy.groups[groupIndex].modules.splice(moduleIndex, 1)

        setCalculationData(calculationData_copy)
    }

    useEffect(() => {
        setResultGPA(calculateCumulativeGPA(calculationData))
        setResultTotalCredits(calculateTotalCredits(calculationData))
    }, [calculationData, systemIndex])

    useEffect(() => {
        setResultFood(calculateFood(resultGPA))
    }, [resultGPA])

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
                    value={calculationData.currentGPA || ""}
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
                    value={calculationData.totalCredits || ""}
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
                    {calculationData.groups.map((group, groupIndex) => (
                        <AccordionItem border="none" mb="16px" key={groupIndex}>
                            <AccordionButton
                                py="8px"
                                px="12px"
                                bg="customIndigo.150"
                                borderRadius={8}
                                _hover={{ bg: "customIndigo.250" }}
                                _active={{ bg: "customIndigo.150" }}>
                                <HStack w="100%" justifyContent="space-between">
                                    <Center gap="8px">
                                        <Heading
                                            fontSize="2xl"
                                            fontWeight="medium">
                                            {group.name}
                                        </Heading>
                                    </Center>
                                    <Center gap="8px">
                                        <Heading
                                            fontSize="2xl"
                                            fontWeight="medium">
                                            {calculateGPAPerGroup(
                                                group,
                                            ).toFixed(2)}
                                        </Heading>
                                        <AccordionIcon />
                                    </Center>
                                </HStack>
                            </AccordionButton>

                            <AccordionPanel bg="customGrey.100">
                                {group.modules.map((module, moduleIndex) => (
                                    <Box
                                        w="100%"
                                        h="auto"
                                        mb="2"
                                        key={moduleIndex}>
                                        <Editable
                                            onChange={value => {
                                                updateModuleName(
                                                    value,
                                                    groupIndex,
                                                    moduleIndex,
                                                )
                                            }}
                                            value={
                                                module.name === undefined
                                                    ? "Enter a module name"
                                                    : module.name
                                            }>
                                            <EditablePreview />
                                            <EditableInput />
                                        </Editable>
                                        <HStack
                                            gap="8px"
                                            justifyContent="space-around">
                                            <Select
                                                key={moduleIndex}
                                                onChange={e => {
                                                    console.log(e.target.value)

                                                    updateModuleGrade(
                                                        e.target.value,
                                                        groupIndex,
                                                        moduleIndex,
                                                    )
                                                }}
                                                value={module.grade}>
                                                {systemIndex === 2
                                                    ? Object.keys(
                                                          PolyGrade,
                                                      ).map((key, index) => (
                                                          <option
                                                              key={index}
                                                              value={
                                                                  PolyGrade[
                                                                      key as keyof typeof PolyGrade
                                                                  ]
                                                              }>
                                                              {key}
                                                          </option>
                                                      ))
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
                                            <Input
                                                type="number"
                                                value={module.credits}
                                                onChange={e =>
                                                    updateModuleCredits(
                                                        e.target.value,
                                                        groupIndex,
                                                        moduleIndex,
                                                    )
                                                }
                                            />
                                            <IconButton
                                                bg="customRed.100"
                                                variant="solid"
                                                p="8px"
                                                size="md"
                                                _hover={{ bg: "customRed.500" }}
                                                _active={{
                                                    bg: "customRed.100",
                                                }}
                                                icon={<Trash2 />}
                                                aria-label={""}
                                                onClick={() =>
                                                    deleteModule(
                                                        groupIndex,
                                                        moduleIndex,
                                                    )
                                                }></IconButton>
                                        </HStack>
                                    </Box>
                                ))}

                                <Button
                                    w="100%"
                                    mt="16px"
                                    variant="outline"
                                    borderWidth="2px"
                                    borderColor="customIndigo.250"
                                    color="customIndigo.100"
                                    _hover={{
                                        bg: "customIndigo.500",
                                        borderColor: "customIndigo.500",
                                    }}
                                    _active={{
                                        bg: "customIndigo.250",
                                        borderColor: "customIndigo.250",
                                    }}
                                    onClick={() => {
                                        setCalculationData(calculationData => ({
                                            ...calculationData,
                                            groups: calculationData.groups.map(
                                                (group, index) => {
                                                    if (index != groupIndex)
                                                        return group
                                                    return {
                                                        ...group,
                                                        modules: [
                                                            ...group.modules,
                                                            defaultModuleValues,
                                                        ],
                                                    }
                                                },
                                            ),
                                        }))
                                    }}>
                                    Add Module
                                </Button>
                            </AccordionPanel>
                        </AccordionItem>
                    ))}
                </Accordion>
                <Button
                    bg="customIndigo.500"
                    w="100%"
                    _hover={{
                        bg: "customIndigo.500",
                        borderColor: "customIndigo.500",
                    }}
                    _active={{
                        bg: "customIndigo.250",
                        borderColor: "customIndigo.250",
                    }}
                    onClick={onOpen}>
                    Add Group
                </Button>
            </Card>
            <ResultText header="Your GPA: " text={resultGPA.toString()} />
            <ResultText
                header="Total Credits: "
                text={resultTotalCredits.toString()}
            />
            <ResultText header="You can buy " text={resultFood} />
            <Modal isOpen={isOpen} onClose={onClose}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Create A Group</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}>
                        <FormControl>
                            <Input
                                placeholder="Group name"
                                value={groupName}
                                onChange={e => setGroupName(e.target.value)}
                            />
                        </FormControl>
                    </ModalBody>

                    <ModalFooter>
                        <Button
                            colorScheme="blue"
                            mr={3}
                            onClick={() => {
                                setCalculationData(calculationData => ({
                                    ...calculationData,
                                    groups: [
                                        ...calculationData.groups,
                                        {
                                            name: groupName,
                                            modules: [defaultModuleValues],
                                        },
                                    ],
                                }))
                                onClose()
                            }}>
                            Save
                        </Button>
                        <Button onClick={onClose}>Cancel</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </VStack>
    )
}

export default Calculator
