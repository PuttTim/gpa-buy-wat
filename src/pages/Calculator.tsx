import { CircleHelp, ClipboardPaste, Lock, LockOpen, Pencil, ScanBarcode, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { flushSync } from "react-dom"
import { toast } from "sonner"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { foodFor } from "@/lib/food"
import { cn } from "@/lib/utils"
import { EdgeStrips } from "../components/EdgeStrips"
import { ImportDialog } from "../components/ImportDialog"
import { ModuleList } from "../components/ModuleList"
import { moduleColumns } from "../components/ModuleRow"
import { Receipt } from "../components/Receipt"
import { ScanDialog } from "../components/ScanDialog"
import { SelectSystem } from "../components/SelectSystem"
import { ThemeToggle } from "../components/ThemeToggle"
import { CalculationData } from "../interfaces/CalculationData"
import { Module } from "../interfaces/Module"
import { Semester } from "../interfaces/Semester"
import {
    createCalculationData,
    createModule,
    loadState,
    saveState,
} from "../lib/storage"
import { pageTitleFor } from "../lib/pages"
import { SYSTEMS, systemPath } from "../lib/systems"
import { calculateGPA, creditsIn } from "../lib/calculation"
import { Beep, primeBeep } from "../lib/sounds"
import { Transcript, transferBarcode, useTransferHost } from "../lib/transfer"

type Update = (data: CalculationData) => CalculationData

const formatGPA = (gpa: number | null) => (gpa === null ? "–" : gpa.toFixed(2))

const insertAt = <T,>(items: T[], index: number, item: T) => [
    ...items.slice(0, index),
    item,
    ...items.slice(index),
]

// Same curve as --ease-out in index.css.
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)"

const HEADER_BUTTON =
    "bg-white/70 text-primary-foreground hover:bg-white/85 hover:text-primary-foreground dark:hover:bg-white/85"

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


    // The semester just added, so only its card animates in.
    const [addedSemester, setAddedSemester] = useState<number | null>(null)

    const [confirmingClear, setConfirmingClear] = useState(false)
    const [saved, setSaved] = useState(true)
    useEffect(() => setSaved(saveState(state)), [state])

    // While this tab is open, the receipt's barcode lets another device scan and
    // copy exactly what's on screen.
    const transferId = useTransferHost(
        () => ({ systemIndex, data: calculationData }),
        () => toast("Sent your grades to another device"),
    )

    const [scanning, setScanning] = useState(false)
    const [importing, setImporting] = useState(false)
    const [beep, setBeep] = useState<Beep | null>(null)
    const selectSystem = (index: number) => {
        setFocusModule(null)
        setAddedSemester(null)
        setRenaming(null)
        history.replaceState(null, "", systemPath(index))
        document.title = pageTitleFor(systemPath(index))
        setState(current => ({
            ...current,
            systemIndex: index,
        }))
    }

    const openScanner = () => {
        // Primed on the tap itself, or the scan beep stays silent on iOS.
        setBeep(primeBeep())
        setScanning(true)
    }

    /** Replaces one system's tab with incoming grades and switches to it. */
    const loadTranscript = (transcript: Transcript, message: string) => {
        setFocusModule(null)
        setAddedSemester(null)
        setRenaming(null)
        toast.dismiss()
        startOverToast.current = null
        history.replaceState(null, "", systemPath(transcript.systemIndex))
        document.title = pageTitleFor(systemPath(transcript.systemIndex))
        const index = transcript.systemIndex
        const previous = state.systems[index]
        setState(current => ({
            systemIndex: index,
            systems: current.systems.map((data, i) => (i === index ? transcript.data : data)),
        }))
        // Nothing asks first, so a wrong scan or paste can be taken back.
        toast(message, {
            action: { label: "Undo", onClick: () => replaceSystem(index, () => previous) },
        })
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

    const moveModule = (semesterIndex: number, from: number, to: number) => {
        updateSemester(semesterIndex, semester => {
            const modules = semester.modules.filter((_, i) => i !== from)
            return { ...semester, modules: insertAt(modules, to, semester.modules[from]) }
        })
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
        setAddedSemester(count)
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
        setAddedSemester(null)
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

    const deleteSemester = (semesterIndex: number, card: HTMLElement | null) => {
        const semester = calculationData.semesters[semesterIndex]
        const remove = () => removeWithUndo(
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
        const list = card?.parentElement
        if (!card || !list) return remove()

        // The semester goes at once, so the receipt updates on the click. A copy of
        // the card fades where it was while everything below slides up into the gap.
        const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches
        const cards = () => [...list.querySelectorAll<HTMLElement>(':scope > [data-slot="accordion-item"]')]
        const below = (fromIndex: number) => {
            const following: HTMLElement[] = []
            for (let next = list.nextElementSibling; next; next = next.nextElementSibling) {
                following.push(next as HTMLElement)
            }
            return [...cards().slice(fromIndex), ...following]
        }
        const ghost = card.cloneNode(true) as HTMLElement
        ghost.removeAttribute("data-slot")
        ghost.setAttribute("aria-hidden", "true")
        ghost.inert = true
        Object.assign(ghost.style, {
            position: "absolute",
            top: `${card.offsetTop}px`,
            left: `${card.offsetLeft}px`,
            width: `${card.offsetWidth}px`,
            pointerEvents: "none",
        })
        // Cards are keyed by index, so after the removal each element below holds
        // the semester that used to be one further down.
        const before = below(semesterIndex + 1).map(element => element.getBoundingClientRect().top)

        flushSync(remove)

        // First in the list, so the cards sliding up over it paint on top.
        list.prepend(ghost)
        ghost
            .animate(
                reduce
                    ? [{ opacity: 1 }, { opacity: 0 }]
                    : [
                          { opacity: 1, transform: "scale(1)" },
                          { opacity: 0, transform: "scale(0.98)" },
                      ],
                { duration: 150, easing: EASE_OUT, fill: "forwards" },
            )
            .finished.finally(() => ghost.remove())
        if (reduce) return
        below(semesterIndex).forEach((element, i) => {
            const offset = before[i] - element.getBoundingClientRect().top
            if (!offset) return
            element.animate(
                [{ transform: `translateY(${offset}px)` }, { transform: "translateY(0)" }],
                { duration: 250, easing: EASE_OUT },
            )
        })
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
    const rawGPA = calculateGPA(allModules)
    // Cap only the cumulative result: SMU A+ still contributes 4.3 points.
    const resultGPA = rawGPA === null ? null : Math.min(rawGPA, system.maxGPA)

    const barFood = resultGPA === null ? null : foodFor(resultGPA)

    return (
        <>
            <EdgeStrips />
            <header className="perforated bg-primary pt-[env(safe-area-inset-top,0px)] pb-1 text-primary-foreground">
                <div className="m-auto grid max-w-[1100px] grid-cols-[1fr_auto_auto] items-center gap-2 safe-x py-3 sm:gap-3">
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
                    <div className="col-span-full row-start-2 grid grid-cols-2 gap-2 lg:hidden">
                        <Button variant="ghost" className={HEADER_BUTTON} onClick={openScanner}>
                            <ScanBarcode />
                            Scan
                        </Button>
                        <Button variant="ghost" className={HEADER_BUTTON} onClick={() => setImporting(true)}>
                            <ClipboardPaste />
                            Import
                        </Button>
                    </div>
                    <ScanDialog
                        open={scanning}
                        onOpenChange={setScanning}
                        beep={beep}
                        onCopy={transcript => {
                            const count = transcript.data.semesters.flatMap(semester => semester.modules).length
                            loadTranscript(
                                transcript,
                                `Copied ${count} ${count === 1 ? "module" : "modules"} into ${SYSTEMS[transcript.systemIndex].name}`,
                            )
                        }}
                    />
                    <ImportDialog
                        open={importing}
                        onOpenChange={setImporting}
                        systemIndex={systemIndex}
                        onImport={data => loadTranscript({ systemIndex, data }, `Imported into ${system.name}`)}
                    />
                    <ThemeToggle />
                </div>
            </header>

            <div className="safe-x m-auto max-w-[1100px] pt-4 lg:pt-6">
            <main className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6">
                <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
                    {/* As tall as the Scan and Import buttons, so the first semester lines up with the receipt. */}
                    <div className="-mb-2 flex items-center gap-2 lg:h-10">
                        <h2 className="font-mono text-lg uppercase lg:text-xl">Your order</h2>
                        <Popover>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    aria-label="Grading help"
                                    className="rounded text-muted-foreground hover:text-foreground">
                                    <CircleHelp className="size-5" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="max-w-[calc(100vw-2rem)] text-sm">
                                <p>{system.gradingHelp}</p>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Accordion
                        type="multiple"
                        className="relative gap-4 lg:gap-6"
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
                                className={cn(
                                    "rounded-xl bg-card p-4 ring-1 ring-foreground/10 not-last:border-b-0",
                                    semesterIndex === addedSemester && "rise-in",
                                )}>
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
                                            {!semester.locked && (
                                                <>
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
                                                    onClick={e =>
                                                        deleteSemester(
                                                            semesterIndex,
                                                            e.currentTarget.closest<HTMLElement>(
                                                                '[data-slot="accordion-item"]',
                                                            ),
                                                        )
                                                    }>
                                                    <Trash2 />
                                                </Button>
                                                </>
                                            )}
                                            {/* Last, so it stays under the pointer when the buttons before it hide. */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={semester.locked ? "text-foreground" : "text-muted-foreground"}
                                                aria-label={`Lock ${semester.name}`}
                                                aria-pressed={!!semester.locked}
                                                onClick={() => {
                                                    setFocusModule(null)
                                                    updateSemester(semesterIndex, s => ({ ...s, locked: !s.locked }))
                                                }}>
                                                {semester.locked ? <Lock /> : <LockOpen />}
                                            </Button>
                                        </>
                                    )}
                                </div>

                                <AccordionContent className="px-0.5 pt-3 pb-0.5">
                                    <div
                                        aria-hidden="true"
                                        className={cn(
                                            "mb-1.5 grid gap-1.5 text-xs font-medium text-muted-foreground sm:gap-2",
                                            moduleColumns(!!semester.locked),
                                        )}>
                                        <span className={cn(!semester.locked && "sm:col-start-2")}>Module</span>
                                        <span>Grade</span>
                                        <span>Credits</span>
                                    </div>
                                    <ModuleList
                                        id={`s${semesterIndex}`}
                                        modules={semester.modules}
                                        grades={system.grades}
                                        locked={!!semester.locked}
                                        focusIndex={
                                            focusModule?.semesterIndex === semesterIndex
                                                ? focusModule.moduleIndex
                                                : null
                                        }
                                        onFocused={() => focusModule && setFocusModule(null)}
                                        onChange={(moduleIndex, changes) =>
                                            updateModule(semesterIndex, moduleIndex, changes)
                                        }
                                        onDelete={moduleIndex => deleteModule(semesterIndex, moduleIndex)}
                                        onMove={(from, to) => moveModule(semesterIndex, from, to)}
                                    />
                                    {!semester.locked && (
                                        <Button
                                            className="mt-4 w-full"
                                            onClick={() => addModule(semesterIndex)}>
                                            Add module
                                        </Button>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>


                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={addSemester}>
                            Add semester
                        </Button>
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
                    <div className="receipt-stub flex items-center justify-between gap-3 bg-paper px-5 pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] font-mono text-paper-ink uppercase">
                        <span className="flex min-w-0 items-center gap-2">
                            {barFood && (
                                <img
                                    key={barFood.name}
                                    src={barFood.icon}
                                    alt=""
                                    className="pop-in size-8 shrink-0 [image-rendering:pixelated]"
                                />
                            )}
                            <span className="truncate text-[13px]">
                                {barFood?.name ?? "Total GPA"}
                            </span>
                        </span>
                        <span className="shrink-0 text-lg leading-7">{formatGPA(resultGPA)}</span>
                    </div>
                </button>

                {/* Only a wrapper on desktop: on phones the receipt must stay next to its stub.
                    It fills the row so the receipt can still stick while the buttons scroll away. */}
                <div className="contents lg:block lg:self-stretch">
                    <div className="hidden grid-cols-2 gap-3 lg:grid">
                        <Button variant="outline" className="border-primary" onClick={openScanner}>
                            <ScanBarcode />
                            Scan
                        </Button>
                        <Button variant="outline" className="border-primary" onClick={() => setImporting(true)}>
                            <ClipboardPaste />
                            Import
                        </Button>
                    </div>
                    <Receipt
                        ref={resultRef}
                        system={system}
                        data={calculationData}
                        credits={creditsIn(allModules)}
                        gpa={resultGPA}
                        barcode={transferBarcode(systemIndex, transferId)}
                        prompt={allModules.length > 0 ? "ADD GPA-GRADED CREDITS" : "ADD A MODULE"}
                    />
                </div>
            </main>

            </div>
        </>
    )
}

export default Calculator
