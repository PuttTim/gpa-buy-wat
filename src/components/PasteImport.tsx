import { ImagePlus, Trash2, X } from "lucide-react"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { CalculationData } from "@/interfaces/CalculationData"
import { Grade } from "@/interfaces/Grade"
import { calculateGPA } from "@/lib/calculation"
import { imageToDataUrl, ParsedSemester, parseImagesWithAI, parseLocally, parseWithAI } from "@/lib/parseGrades"
import { SYSTEMS } from "@/lib/systems"
import { cn } from "@/lib/utils"

const MAX_IMAGES = 4

interface PasteImportProps {
    systemIndex: number
    onImport: (data: CalculationData) => void
}

/** Paste grades or add screenshots, check what was read, then import it. */
export const PasteImport = ({ systemIndex, onImport }: PasteImportProps) => {
    const system = SYSTEMS[systemIndex]
    const [text, setText] = useState("")
    const [reading, setReading] = useState(false)
    const [problem, setProblem] = useState("")
    const [semesters, setSemesters] = useState<ParsedSemester[] | null>(null)
    const [images, setImages] = useState<string[]>([])
    const fileInput = useRef<HTMLInputElement>(null)

    const addImages = async (files: FileList | null) => {
        if (!files) return
        const picked = [...files].filter(file => file.type.startsWith("image/")).slice(0, MAX_IMAGES - images.length)
        const added = await Promise.all(picked.map(imageToDataUrl))
        setImages(current => [...current, ...added].slice(0, MAX_IMAGES))
    }

    const read = async () => {
        setProblem("")
        const local = parseLocally(systemIndex, text)
        if (images.length === 0 && !local.needsAI) return setSemesters(local.semesters)
        setReading(true)
        try {
            const result = images.length > 0
                ? await parseImagesWithAI(systemIndex, images)
                : await parseWithAI(systemIndex, text, local)
            if (result.every(semester => semester.modules.length === 0))
                setProblem("Couldn't find any modules. Try one per line, like \"CS2030 A\".")
            else setSemesters(result)
        } catch (error) {
            setProblem(error instanceof Error ? error.message : "Couldn't read that.")
        } finally {
            setReading(false)
        }
    }

    if (semesters) {
        return (
            <Review
                systemIndex={systemIndex}
                semesters={semesters}
                setSemesters={update => setSemesters(current => (current ? update(current) : current))}
                onBack={() => setSemesters(null)}
                onImport={onImport}
            />
        )
    }

    return (
        <>
            <DialogDescription>
                Paste your grades, one module per line, or add screenshots of your results.
            </DialogDescription>
            <textarea
                aria-label="Grades to import"
                rows={6}
                value={text}
                onChange={event => setText(event.target.value)}
                placeholder={"CS2030 A\nCS2040 A-\nCS2100: B+"}
                className="w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-base outline-none placeholder:text-muted-foreground focus:border-foreground/40 sm:text-sm dark:bg-input/30"
            />
            {images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {images.map((image, i) => (
                        <div key={i} className="relative">
                            <img src={image} alt={`Screenshot ${i + 1}`} className="h-16 rounded-md object-cover ring-1 ring-foreground/10" />
                            <button
                                type="button"
                                aria-label={`Remove screenshot ${i + 1}`}
                                onClick={() => setImages(current => current.filter((_, j) => j !== i))}
                                className="absolute -top-2 -right-2 rounded-full bg-popover p-0.5 ring-1 ring-foreground/20">
                                <X className="size-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <p role="status" className="text-destructive empty:hidden">
                {problem}
            </p>
            <div className="grid grid-cols-[auto_1fr] gap-2">
                <Button
                    variant="outline"
                    disabled={reading || images.length >= MAX_IMAGES}
                    onClick={() => fileInput.current?.click()}>
                    <ImagePlus />
                    Screenshot
                </Button>
                <input
                    ref={fileInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    hidden
                    onChange={event => {
                        addImages(event.target.files)
                        event.target.value = ""
                    }}
                />
                <Button disabled={reading || (!text.trim() && images.length === 0)} onClick={read}>
                    {reading ? "Reading..." : "Read grades"}
                </Button>
            </div>
            <p className="text-xs text-muted-foreground">
                Screenshots, and lines this device can't read, are read by Cloudflare's AI. Nothing is
                stored. Check every highlighted row: screenshots are often misread. Imports into your{" "}
                {system.name} tab.
            </p>
        </>
    )
}

interface ReviewProps {
    systemIndex: number
    semesters: ParsedSemester[]
    setSemesters: (update: (semesters: ParsedSemester[]) => ParsedSemester[]) => void
    onBack: () => void
    onImport: (data: CalculationData) => void
}

const Review = ({ systemIndex, semesters, setSemesters, onBack, onImport }: ReviewProps) => {
    const system = SYSTEMS[systemIndex]
    const modules = semesters.flatMap(semester => semester.modules)
    const missing = modules.filter(module => module.grade === null).length
    const unsure = modules.filter(module => module.unsure).length

    const data: CalculationData = {
        currentGPA: "",
        totalCredits: 0,
        semesters: semesters
            .filter(semester => semester.modules.length > 0)
            .map(semester => ({
                name: semester.name,
                modules: semester.modules.map(module => ({
                    name: module.code,
                    grade: module.grade ?? system.defaultGrade,
                    credits: module.credits ?? system.defaultCredits,
                })),
            })),
    }
    const gpa = calculateGPA(data.semesters.flatMap(semester => semester.modules))

    const update = (si: number, mi: number, change: Partial<ParsedSemester["modules"][number]>) =>
        setSemesters(current =>
            current.map((semester, i) =>
                i !== si
                    ? semester
                    : {
                          ...semester,
                          modules: semester.modules.map((module, j) =>
                              j === mi ? { ...module, ...change, unsure: false } : module,
                          ),
                      },
            ),
        )

    const remove = (si: number, mi: number) =>
        setSemesters(current =>
            current.map((semester, i) =>
                i === si ? { ...semester, modules: semester.modules.filter((_, j) => j !== mi) } : semester,
            ),
        )

    return (
        <>
            <DialogDescription>
                Found {modules.length} {modules.length === 1 ? "module" : "modules"}
                {gpa === null || missing > 0 ? "" : `, GPA ${gpa.toFixed(2)}`}.{" "}
                {unsure > 0 ? "Check the highlighted rows. " : ""}This replaces everything in your {system.name} tab.
            </DialogDescription>
            <div className="-mx-1 max-h-[45dvh] overflow-y-auto px-1">
                {semesters.map((semester, si) =>
                    semester.modules.length === 0 ? null : (
                        <div key={si} className="mb-3">
                            <p className="mb-1.5 font-mono text-xs text-muted-foreground uppercase">{semester.name}</p>
                            <ul className="flex flex-col gap-1.5">
                                {semester.modules.map((module, mi) => (
                                    <li
                                        key={mi}
                                        className={cn(
                                            "grid grid-cols-[minmax(0,1fr)_6.5rem_3.5rem_auto] items-center gap-1.5 rounded-lg p-1",
                                            module.unsure && "bg-amber-500/12 ring-1 ring-amber-500/50",
                                        )}>
                                        <Input
                                            aria-label="Module"
                                            className="h-9 px-2 font-mono text-sm"
                                            value={module.code}
                                            onChange={event => update(si, mi, { code: event.target.value })}
                                        />
                                        <NativeSelect
                                            aria-label="Grade"
                                            className="w-full [&_select]:h-9"
                                            value={module.grade ?? ""}
                                            onChange={event => update(si, mi, { grade: event.target.value as Grade })}>
                                            {module.grade === null && <NativeSelectOption value="">Grade?</NativeSelectOption>}
                                            {Object.entries(system.grades).map(([label, value]) => (
                                                <NativeSelectOption key={label} value={value}>
                                                    {label}
                                                </NativeSelectOption>
                                            ))}
                                        </NativeSelect>
                                        <Input
                                            aria-label="Credits"
                                            className="h-9 px-2 font-mono text-sm"
                                            inputMode="decimal"
                                            placeholder={String(system.defaultCredits)}
                                            // Uncontrolled, so a half-typed "0." stays put while typing.
                                            defaultValue={module.credits ?? ""}
                                            onChange={event => {
                                                const value = event.target.value.replace(/[^\d.]/g, "")
                                                event.target.value = value
                                                const credits = parseFloat(value)
                                                update(si, mi, { credits: Number.isFinite(credits) ? Math.min(credits, 40) : null })
                                            }}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            aria-label={`Remove ${module.code}`}
                                            onClick={() => remove(si, mi)}>
                                            <Trash2 />
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ),
                )}
            </div>
            {missing > 0 && (
                <p className="text-destructive">
                    Pick a grade for {missing === 1 ? "the module" : `the ${missing} modules`} marked "Grade?".
                </p>
            )}
            <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={onBack}>
                    Back
                </Button>
                <Button disabled={missing > 0 || modules.length === 0} onClick={() => onImport(data)}>
                    Import
                </Button>
            </div>
        </>
    )
}
