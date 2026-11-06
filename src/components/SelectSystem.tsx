import { ChevronDownIcon } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { trackSystemSelected } from "@/lib/analytics"
import { SYSTEMS, TAB_ORDER } from "@/lib/systems"

interface SelectSystemProps {
    index: number
    setIndex: (index: number) => void
}

export const SelectSystem = ({ index, setIndex }: SelectSystemProps) => {
    const select = (value: string) => {
        setIndex(Number(value))
        trackSystemSelected(SYSTEMS[Number(value)].name)
    }
    return (
        <>
            {/* Phones: a dropdown on the left of the header's second row, leaving room for Import. */}
            <div className="relative row-start-2 justify-self-start sm:hidden">
                <select
                    aria-label="Grading system"
                    value={String(index)}
                    onChange={event => select(event.target.value)}
                    className="h-10 appearance-none rounded-lg bg-primary-foreground/15 pr-9 pl-3 font-mono text-[13px] text-primary-foreground uppercase outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/60">
                    {TAB_ORDER.map(i => (
                        <option key={i} value={String(i)} className="bg-[Canvas] text-[CanvasText]">
                            {SYSTEMS[i].name}
                        </option>
                    ))}
                </select>
                <ChevronDownIcon
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
                />
            </div>
            <SystemTabs index={index} select={select} />
        </>
    )
}

const SystemTabs = ({ index, select }: { index: number; select: (value: string) => void }) => (
    <Tabs className="hidden sm:flex" value={String(index)} onValueChange={select}>
        <TabsList
            aria-label="Grading system"
            className="relative grid w-full grid-cols-4 bg-primary-foreground/15 group-data-horizontal/tabs:h-10 sm:w-72">
            {/* White in both themes, so a label never needs to change colour as it moves. */}
            <span
                aria-hidden="true"
                className="slide absolute inset-y-[3px] left-[3px] w-[calc((100%-6px)/4)] rounded-md bg-white"
                style={{
                    transform: `translateX(${TAB_ORDER.indexOf(index) * 100}%)`,
                }}
            />
            {TAB_ORDER.map(i => (
                <TabsTrigger
                    key={i}
                    value={String(i)}
                    className="z-10 font-mono text-[13px] font-normal text-primary-foreground uppercase transition-none hover:text-primary-foreground data-active:bg-transparent data-active:text-primary-foreground dark:text-primary-foreground dark:hover:text-primary-foreground dark:data-active:border-transparent dark:data-active:bg-transparent dark:data-active:text-primary-foreground group-data-[variant=default]/tabs-list:data-active:shadow-none">
                    {SYSTEMS[i].name}
                </TabsTrigger>
            ))}
        </TabsList>
    </Tabs>
)
