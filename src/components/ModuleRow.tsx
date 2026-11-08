import { GripVertical, Trash2 } from "lucide-react"
import { ButtonHTMLAttributes, HTMLAttributes } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { MAX_CREDITS } from "@/lib/storage"
import { cn } from "@/lib/utils"
import { Grade } from "../interfaces/Grade"
import { Module } from "../interfaces/Module"
import { NumberField } from "./NumberField"

/** Phones drag by holding a row, so the handle column only shows from `sm` up. */
const EDITING_COLUMNS =
    "grid-cols-[minmax(0,1fr)_92px_48px_32px] sm:grid-cols-[20px_minmax(0,1fr)_128px_88px_40px]"
/** Locked rows have nothing to drag or delete, so they drop both of those columns. */
const LOCKED_COLUMNS = "grid-cols-[minmax(0,1fr)_92px_48px] sm:grid-cols-[minmax(0,1fr)_128px_88px]"

export const moduleColumns = (locked: boolean) => (locked ? LOCKED_COLUMNS : EDITING_COLUMNS)

interface ModuleRowProps {
    id: string
    module: Module
    grades: Record<string, Grade>
    locked: boolean
    autoFocus: boolean
    onFocused: () => void
    onChange: (changes: Partial<Module>) => void
    onDelete: () => void
    /** Pointer handlers for dragging the row, by its handle or a long press. */
    rowProps: HTMLAttributes<HTMLLIElement>
    /** Pointer and key handlers for the drag handle. */
    handleProps: ButtonHTMLAttributes<HTMLButtonElement>
}

const gradeName = (grades: Record<string, Grade>, grade: Grade) =>
    Object.entries(grades).find(([, value]) => value === grade)?.[0] ?? grade

export const ModuleRow = ({
    id,
    module,
    grades,
    locked,
    autoFocus,
    onFocused,
    onChange,
    onDelete,
    rowProps,
    handleProps,
}: ModuleRowProps) => {
    const name = module.name.trim() || "module"

    // A compact table, lined up with the column labels above it.
    if (locked) {
        return (
            <li className={cn("grid items-baseline gap-1.5 py-1 sm:gap-2", LOCKED_COLUMNS)}>
                <span className="truncate">
                    {module.name.trim() || <span className="text-muted-foreground">Untitled</span>}
                </span>
                <span className="truncate">{gradeName(grades, module.grade)}</span>
                <span className="font-mono">{module.credits}</span>
            </li>
        )
    }

    return (
        <li
            className={cn(
                "grid items-center gap-1.5 sm:gap-2",
                // While dragged or settling: a solid, raised surface above the other rows.
                "data-dragging:relative data-dragging:z-10 data-dragging:rounded-lg data-dragging:bg-card data-dragging:shadow-lg",
                // Below `sm` the handle is visually hidden, so its row shows where focus is.
                "rounded-lg has-[[data-handle]:focus-visible]:bg-muted",
                EDITING_COLUMNS,
            )}
            {...rowProps}>
            <button
                type="button"
                id={`${id}-handle`}
                data-handle=""
                aria-label={`Move ${name}. Use the up and down arrow keys.`}
                className="sr-only h-10 cursor-grab sm:not-sr-only sm:flex touch-none items-center justify-center rounded text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground active:cursor-grabbing"
                {...handleProps}>
                <GripVertical className="size-4" />
            </button>
            <div className="min-w-0">
                <Input
                    id={`${id}-name`}
                    aria-label="Module name"
                    placeholder="Name"
                    autoComplete="off"
                    autoFocus={autoFocus}
                    onFocus={onFocused}
                    value={module.name}
                    onChange={e => onChange({ name: e.target.value })}
                />
            </div>
            <div className="min-w-0">
                <Label htmlFor={`${id}-grade`} className="sr-only">
                    Grade
                </Label>
                <NativeSelect
                    id={`${id}-grade`}
                    className="w-full"
                    value={module.grade}
                    onChange={e => onChange({ grade: e.target.value as Grade })}>
                    {Object.entries(grades).map(([name, value]) => (
                        <NativeSelectOption key={name} value={value}>
                            {name}
                        </NativeSelectOption>
                    ))}
                </NativeSelect>
            </div>
            <div className="min-w-0">
                <Label htmlFor={`${id}-credits`} className="sr-only">
                    Credits
                </Label>
                <NumberField
                    id={`${id}-credits`}
                    placeholder="0"
                    max={MAX_CREDITS}
                    value={module.credits ? String(module.credits) : ""}
                    onChange={value => onChange({ credits: parseInt(value) || 0 })}
                />
            </div>
            <Button
                variant="ghost"
                size="icon"
                className="w-full min-w-0 text-muted-foreground hover:text-destructive"
                aria-label={`Delete ${name}`}
                onClick={onDelete}>
                <Trash2 />
            </Button>
        </li>
    )
}
