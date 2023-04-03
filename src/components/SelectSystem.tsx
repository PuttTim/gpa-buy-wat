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
import ReactGA from "react-ga4"

interface SelectSystemProps {
    setIndex: (index: number) => void
}

export const SelectSystem = (props: SelectSystemProps) => {
    const selectedTabSx = {
        color: "customWhite.100",
        borderColor: "customIndigo.500",
        bgColor: "customIndigo.500",
    }

    const activeTabSx = {
        bg: "customIndigo.250",
        borderColor: "customIndigo.250",
    }

    const hoverTabSx = {
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
        <Box w="100%" px="12px" py="8px" bg="customGrey.500" borderRadius={8}>
            <Tabs
                w="100%"
                variant="unstyled"
                onChange={index => {
                    props.setIndex(index)
                    ReactGA.event({
                        category: "Click",
                        action: "select_system",
                        value: index,
                    })
                }}>
                <TabList justifyContent="space-between" gap="8px">
                    <Tab
                        {...tabSx}
                        _selected={selectedTabSx}
                        _hover={hoverTabSx}
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
                        _hover={hoverTabSx}
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
                        _hover={hoverTabSx}
                        _active={activeTabSx}>
                        Poly
                    </Tab>
                </TabList>
            </Tabs>
        </Box>
    )
}
