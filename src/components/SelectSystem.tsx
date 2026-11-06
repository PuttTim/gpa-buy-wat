import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { trackSystemSelected } from "@/lib/analytics"
import { SYSTEMS, TAB_ORDER } from "@/lib/systems"

interface SelectSystemProps {
    index: number
    setIndex: (index: number) => void
}

export const SelectSystem = ({ index, setIndex }: SelectSystemProps) => (
    <Tabs
        className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto"
        value={String(index)}
        onValueChange={value => {
            setIndex(Number(value))
            trackSystemSelected(SYSTEMS[Number(value)].name)
        }}>
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
