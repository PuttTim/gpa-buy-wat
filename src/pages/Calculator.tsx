import { CircleHelp, Pencil, ScanBarcode, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { foodFor } from "@/lib/food"
import { cn } from "@/lib/utils"
import { ImportDialog } from "../components/ImportDialog"
import { MODULE_COLUMNS, ModuleRow } from "../components/ModuleRow"
import { NumberField } from "../components/NumberField"
import { Receipt } from "../components/Receipt"
import { SelectSystem } from "../components/SelectSystem"
import { ThemeToggle } from "../components/ThemeToggle"
import { CalculationData } from "../interfaces/CalculationData"
import { Module } from "../interfaces/Module"
import { Semester } from "../interfaces/Semester"
import {
    createCalculationData,
    createModule,
    loadState,
    MAX_CREDITS,
    saveState,
} from "../lib/storage"
import { pageTitleFor } from "../lib/pages"
import { SYSTEMS, systemPath } from "../lib/systems"
import { calculateGPA, creditsIn } from "../lib/calculation"
import { Beep, importBarcode, primeBeep, useImportHost } from "../lib/transfer"

type Update = (data: CalculationData) => CalculationData

const formatGPA = (gpa: number | null) => (gpa === null ? "–" : gpa.toFixed(2))

const insertAt = <T,>(items: T[], index: number, item: T) => [
    ...items.slice(0, index),
    item,
    ...items.slice(index),
]

const Calculator = () => {
    const [state, setState] = useState(loadState)
    const { systemIndex } = state
    const calculationData = state.systems[systemIndex]
    const system = SYSTEMS[systemIndex]

    // The new module whose name field should take focus when it appears.
    const [focusModule, setFocusModule] = useState<{
        semesterIndex: number
        moduleIndex: number
    } | null>(null)

    const [renaming, setRenaming] = useState<{
        index: number
        name: string
    } | null>(null)

    const resultRef = useRef<HTMLElement>(null)

    const [confirmingClear, setConfirmingClear] = useState(false)
    const [saved, setSaved] = useState(true)
    useEffect(() => setSaved(saveState(state)), [state])

    // While this tab is open, the receipt's barcode lets another device scan and
    // import exactly what's on screen.
    const importId = useImportHost(
        () => ({ systemIndex, data: calculationData }),
        () => toast("Sent your grades to another device"),
    )

    const [importing, setImporting] = useState(false)
    const [beep, setBeep] = useState<Beep | null>(null)
    const selectSystem = (index: number) => {
        setFocusModule(null)
        setRenaming(null)
        history.replaceState(null, "", systemPath(index))
        document.title = pageTitleFor(systemPath(index))
        setState(current => ({
            ...current,
            systemIndex: index,
        }))
    }

    const openImport = () => {
        // Primed on the tap itself, or the scan beep stays silent on iOS.
        setBeep(primeBeep())
        setImporting(true)
    }

    const replaceSystem = (index: number, update: Update) => {
        setState(current => ({
            ...current,
            systems: current.systems.map((data, i) =>
                i === index ? update(data) : data,
            ),
        }))
    }

    // Undoing "Start over" restores a snapshot, so it can't survive later edits.
    const startOverToast = useRef<string | number | null>(null)

    const updateData = (update: Update) => {
        if (startOverToast.current !== null) {
            toast.dismiss(startOverToast.current)
            startOverToast.current = null
        }
        replaceSystem(systemIndex, update)
    }

    const updateSemester = (
        semesterIndex: number,
        update: (semester: Semester) => Semester,
    ) => {
        updateData(data => ({
            ...data,
            semesters: data.semesters.map((semester, i) =>
                i === semesterIndex ? update(semester) : semester,
            ),
        }))
    }

    const updateModule = (
        semesterIndex: number,
        moduleIndex: number,
        changes: Partial<Module>,
    ) => {
        updateSemester(semesterIndex, semester => ({
            ...semester,
            modules: semester.modules.map((module, i) =>
                i === moduleIndex ? { ...module, ...changes } : module,
            ),
        }))
    }

    const addModule = (semesterIndex: number) => {
        setFocusModule({
            semesterIndex,
            moduleIndex: calculationData.semesters[semesterIndex].modules.length,
        })
        updateSemester(semesterIndex, semester => ({
            ...semester,
            modules: [...semester.modules, createModule(systemIndex)],
        }))
    }

    const addSemester = () => {
        const count = calculationData.semesters.length
        setFocusModule({ semesterIndex: count, moduleIndex: 0 })
        updateData(data => ({
            ...data,
            semesters: [
                ...data.semesters,
                {
                    name: `Semester ${count + 1}`,
                    modules: [createModule(systemIndex)],
                },
            ],
        }))
    }

    const commitRename = () => {
        if (!renaming) return
        const name = renaming.name.trim()
        if (name) updateSemester(renaming.index, s => ({ ...s, name }))
        setRenaming(null)
    }

    /** Only the latest removal can be undone, so its position is still valid. */
    const removeWithUndo = (message: string, remove: Update, restore: Update) => {
        const index = systemIndex
        setFocusModule(null)
        setRenaming(null)
        toast.dismiss()
        startOverToast.current = null
        replaceSystem(index, remove)
        return toast(message, {
            action: {
                label: "Undo",
                onClick: () => replaceSystem(index, restore),
            },
        })
    }

    const deleteModule = (semesterIndex: number, moduleIndex: number) => {
        const module = calculationData.semesters[semesterIndex].modules[moduleIndex]
        const withModules = (
            data: CalculationData,
            change: (modules: Module[]) => Module[],
        ) => ({
            ...data,
            semesters: data.semesters.map((s, i) =>
                i === semesterIndex ? { ...s, modules: change(s.modules) } : s,
            ),
        })
        removeWithUndo(
            `Deleted ${module.name.trim() || "module"}`,
            data =>
                withModules(data, modules =>
                    modules.filter((_, i) => i !== moduleIndex),
                ),
            data =>
                withModules(data, modules =>
                    insertAt(modules, moduleIndex, module),
                ),
        )
    }

    const deleteSemester = (semesterIndex: number) => {
        const semester = calculationData.semesters[semesterIndex]
        removeWithUndo(
            `Deleted ${semester.name}`,
            data => ({
                ...data,
                semesters: data.semesters.filter((_, i) => i !== semesterIndex),
            }),
            data => ({
                ...data,
                semesters: insertAt(data.semesters, semesterIndex, semester),
            }),
        )
    }

    const startOver = () => {
        const previous = calculationData
        startOverToast.current = removeWithUndo(
            `Cleared ${system.name}`,
            () => createCalculationData(systemIndex),
            () => previous,
        )
    }

    const allModules = calculationData.semesters.flatMap(s => s.modules)
    const rawGPA = calculateGPA(
        allModules,
        calculationData.totalCredits,
        parseFloat(calculationData.currentGPA) || 0,
    )
    // Cap only the cumulative result: SMU A+ still contributes 4.3 points.
    const resultGPA = rawGPA === null ? null : Math.min(rawGPA, system.maxGPA)

    const barFood = resultGPA === null ? null : foodFor(resultGPA)

    return (
        <>
            <header className="perforated bg-primary pt-[env(safe-area-inset-top,0px)] pb-1 text-primary-foreground">
                <div className="m-auto grid max-w-[1100px] grid-cols-[1fr_auto_auto] items-center gap-2 px-4 py-3 sm:gap-3 lg:px-6">
                    <div className="flex items-center gap-2.5">
                        <img
                            src="/favicon.svg"
                            alt=""
                            className="size-8 [image-rendering:pixelated]"
                        />
                        <h1 className="font-mono text-base whitespace-nowrap uppercase sm:text-xl">GPA buy what?</h1>
                    </div>
                    <SelectSystem index={systemIndex} setIndex={selectSystem} className="hidden sm:flex" />
                    <SelectSystem dropdown index={systemIndex} setIndex={selectSystem} className="sm:hidden" />
                    <ThemeToggle />
                </div>
            </header>

            <div className="m-auto max-w-[1100px] px-4 pt-4 lg:px-6 lg:pt-6">
            <main className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6">
                <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
                    <div className="-mb-2 flex items-end justify-between gap-3 lg:-mb-3">
                        <div>
                            <h2 className="font-mono text-base uppercase">So far</h2>
                            <p className="text-sm text-muted-foreground">
                                Your GPA and credits from past semesters
                            </p>
                        </div>
                        {/* On phones the header only has room for the school picker, so Import lives here. */}
                        <Button className="shrink-0 sm:hidden" onClick={openImport}>
                            <ScanBarcode />
                            Import
                        </Button>
                    </div>
                    <Card>
                        <CardContent className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="current-gpa" className="mb-1.5">
                                    GPA
                                </Label>
                                <NumberField
                                    id="current-gpa"
                                    placeholder={`Up to ${system.maxGPA.toFixed(2)}`}
                                    decimals
                                    max={system.maxGPA}
                                    value={calculationData.currentGPA}
                                    onChange={currentGPA =>
                                        updateData(data => ({ ...data, currentGPA }))
                                    }
                                />
                            </div>
                            <div>
                                <Label htmlFor="total-credits" className="mb-1.5">
                                    Credits
                                </Label>
                                <NumberField
                                    id="total-credits"
                                    placeholder="0"
                                    max={MAX_CREDITS}
                                    value={
                                        calculationData.totalCredits
                                            ? String(calculationData.totalCredits)
                                            : ""
                                    }
                                    onChange={value =>
                                        updateData(data => ({
                                            ...data,
                                            totalCredits: parseInt(value) || 0,
                                        }))
                                    }
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="-mb-2 mt-2 flex items-center gap-2 lg:-mb-3">
                        <h2 className="font-mono text-base uppercase">Your order</h2>
                        <Popover>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    aria-label="Grading help"
                                    className="rounded text-muted-foreground hover:text-foreground">
                                    <CircleHelp className="size-4" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="max-w-[calc(100vw-2rem)] text-sm">
                                <p>{system.gradingHelp}</p>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Accordion
                        type="multiple"
                        className="gap-4 lg:gap-6"
                        value={calculationData.semesters.flatMap((semester, i) =>
                            semester.collapsed ? [] : [String(i)],
                        )}
                        onValueChange={open =>
                            updateData(data => ({
                                ...data,
                                semesters: data.semesters.map((semester, i) => ({
                                    ...semester,
                                    collapsed: !open.includes(String(i)),
                                })),
                            }))
                        }>
                        {calculationData.semesters.map((semester, semesterIndex) => (
                            <AccordionItem
                                key={semesterIndex}
                                value={String(semesterIndex)}
                                className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 not-last:border-b-0">
                                <div className="flex items-center gap-1">
                                    {renaming?.index === semesterIndex ? (
                                        <Input
                                            autoFocus
                                            aria-label="Semester name"
                                            className="font-semibold"
                                            value={renaming.name}
                                            onFocus={e => e.target.select()}
                                            onChange={e =>
                                                setRenaming({
                                                    index: semesterIndex,
                                                    name: e.target.value,
                                                })
                                            }
                                            onBlur={commitRename}
                                            onKeyDown={e => {
                                                if (e.key === "Enter") commitRename()
                                                if (e.key === "Escape") setRenaming(null)
                                            }}
                                        />
                                    ) : (
                                        <>
                                            <AccordionTrigger className="min-w-0 items-center gap-3 py-1 hover:no-underline">
                                                <span className="min-w-0 flex-1 truncate text-base font-semibold">
                                                    {semester.name}
                                                </span>
                                                <span className="shrink-0 font-mono text-base">
                                                    {formatGPA(calculateGPA(semester.modules))}
                                                </span>
                                            </AccordionTrigger>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-muted-foreground"
                                                aria-label={`Rename ${semester.name}`}
                                                onClick={() =>
                                                    setRenaming({
                                                        index: semesterIndex,
                                                        name: semester.name,
                                                    })
                                                }>
                                                <Pencil />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-muted-foreground hover:text-destructive"
                                                aria-label={`Delete ${semester.name}`}
                                                onClick={() => deleteSemester(semesterIndex)}>
                                                <Trash2 />
                                            </Button>
                                        </>
                                    )}
                                </div>

                                <AccordionContent className="px-0.5 pt-3 pb-0.5">
                                    <div
                                        aria-hidden="true"
                                        className={cn(
                                            "mb-1.5 grid gap-1.5 text-xs font-medium text-muted-foreground sm:gap-2",
                                            MODULE_COLUMNS,
                                        )}>
                                        <span>Module</span>
                                        <span>Grade</span>
                                        <span>Credits</span>
                                    </div>
                                    <ul className="flex flex-col gap-2">
                                        {semester.modules.map((module, moduleIndex) => (
                                            <ModuleRow
                                                key={moduleIndex}
                                                id={`s${semesterIndex}-m${moduleIndex}`}
                                                module={module}
                                                grades={system.grades}
                                                autoFocus={
                                                    focusModule?.semesterIndex === semesterIndex &&
                                                    focusModule?.moduleIndex === moduleIndex
                                                }
                                                onFocused={() =>
                                                    focusModule && setFocusModule(null)
                                                }
                                                onChange={changes =>
                                                    updateModule(semesterIndex, moduleIndex, changes)
                                                }
                                                onDelete={() =>
                                                    deleteModule(semesterIndex, moduleIndex)
                                                }
                                            />
                                        ))}
                                    </ul>
                                    <Button
                                        className="mt-4 w-full"
                                        onClick={() => addModule(semesterIndex)}>
                                        Add module
                                    </Button>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>


                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={addSemester}>
                            Add semester
                        </Button>
                        {/* On phones, Import sits beside "So far" instead. */}
                        <Button variant="outline" className="hidden sm:inline-flex" onClick={openImport}>
                            <ScanBarcode />
                            Import
                        </Button>
                        <ImportDialog
                            open={importing}
                            onOpenChange={setImporting}
                            beep={beep}
                            systemIndex={systemIndex}
                            onImport={transcript => {
                                setFocusModule(null)
                                setRenaming(null)
                                toast.dismiss()
                                startOverToast.current = null
                                history.replaceState(null, "", systemPath(transcript.systemIndex))
                                document.title = pageTitleFor(systemPath(transcript.systemIndex))
                                setState(current => ({
                                    systemIndex: transcript.systemIndex,
                                    systems: current.systems.map((data, i) =>
                                        i === transcript.systemIndex ? transcript.data : data,
                                    ),
                                }))
                                toast(`Imported into ${SYSTEMS[transcript.systemIndex].name}`)
                            }}
                        />
                        <Popover open={confirmingClear} onOpenChange={setConfirmingClear}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="text-muted-foreground hover:text-destructive">
                                    Start over
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-auto gap-3 p-3">
                                <p className="font-medium">Clear everything in {system.name}?</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setConfirmingClear(false)}>
                                        Keep
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            setConfirmingClear(false)
                                            startOver()
                                        }}>
                                        Clear
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <p role="status" className="text-sm text-destructive empty:hidden">
                        {!saved && "Couldn't save on this device"}
                    </p>
                </div>

                {/* Sticks to the bottom of a phone's screen, then becomes the top of the receipt. */}
                <button
                    type="button"
                    aria-label="View receipt"
                    onClick={() => resultRef.current?.scrollIntoView({ behavior: "smooth" })}
                    className="receipt-stub-shadow sticky bottom-0 z-10 -mb-[17px] lg:hidden">
                    <div className="receipt-stub flex items-center justify-between gap-3 bg-paper px-5 pt-4 pb-[max(0.625rem,env(safe-area-inset-bottom))] font-mono text-paper-ink uppercase">
                        <span className="flex min-w-0 items-center gap-2">
                            {barFood && (
                                <img
                                    src={barFood.icon}
                                    alt=""
                                    className="size-8 shrink-0 [image-rendering:pixelated]"
                                />
                            )}
                            <span className="truncate text-[13px]">
                                {barFood?.name ?? "Total GPA"}
                            </span>
                        </span>
                        <span className="shrink-0 text-lg leading-7">{formatGPA(resultGPA)}</span>
                    </div>
                </button>

                <Receipt
                    ref={resultRef}
                    system={system}
                    data={calculationData}
                    credits={calculationData.totalCredits + creditsIn(allModules)}
                    gpa={resultGPA}
                    barcode={importBarcode(systemIndex, importId)}
                    prompt={allModules.length > 0 ? "ADD GPA-GRADED CREDITS" : "ADD A MODULE"}
                />
            </main>

            </div>
        </>
    )
}

export default Calculator
