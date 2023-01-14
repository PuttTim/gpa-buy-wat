import {
    Box,
    Button,
    Divider,
    Flex,
    HStack,
    StackDivider,
    Tab,
    TabList,
    Tabs,
    useTab,
    VStack,
} from "@chakra-ui/react"

interface SelectSystemProps {
    setIndex: (index: number) => void
}

export const SelectSystem = (props: SelectSystemProps) => {
    const selectedTabSx = {
        color: "customWhite.100",
        bgColor: "customIndigo.250",
    }

    const activeTabSx = {
        bg: "customIndigo.500",
        borderColor: "customIndigo.500",
    }

    const tabSx = {
        w: "100%",
        borderRadius: 8,
        borderWidth: 2,
        borderColor: "customIndigo.250",
        color: "customIndigo.100",
    }
    return (
        // <HStack
        //     w="100%"
        //     py="8px"
        //     px="12px"
        //     bg="customGrey.500"
        //     justify="space-between"
        //     gap="8px"
        //     divider={<StackDivider />}>
        //     <Button w="33%">NUS</Button>
        //     <Button w="33%">NTU</Button>
        //     <Button w="33%">Poly</Button>
        // </HStack>
        <Box w="100%" px="12px" py="8px" bg="customGrey.500" borderRadius={8}>
            <Tabs
                w="100%"
                variant="unstyled"
                onChange={index => {
                    props.setIndex(index)
                }}>
                <TabList justifyContent="space-between" gap="8px">
                    <Tab
                        {...tabSx}
                        _selected={selectedTabSx}
                        _active={activeTabSx}>
                        NUS
                    </Tab>
                    <Box
                        w="4px"
                        my="0px"
                        bg="customGrey.900"
                        borderRadius={8}
                    />
                    <Tab
                        {...tabSx}
                        _selected={selectedTabSx}
                        _active={activeTabSx}>
                        NTU
                    </Tab>
                    <Box
                        w="2px"
                        my="0px"
                        bg="customGrey.900"
                        borderRadius={8}
                    />
                    <Tab
                        {...tabSx}
                        _selected={selectedTabSx}
                        _active={activeTabSx}>
                        Poly
                    </Tab>
                </TabList>
            </Tabs>
        </Box>
    )
}
