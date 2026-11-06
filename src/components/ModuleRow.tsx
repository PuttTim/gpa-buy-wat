import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { MAX_CREDITS } from "@/lib/storage"
import { cn } from "@/lib/utils"
import { Grade } from "../interfaces/Grade"
import { Module } from "../interfaces/Module"
import { NumberField } from "./NumberField"

export const MODULE_COLUMNS =
    "grid-cols-[minmax(0,1fr)_92px_48px_40px] sm:grid-cols-[minmax(0,1fr)_128px_88px_40px]"


interface ModuleRowProps {
    id: string
    module: Module
    grades: Record<string, Grade>
    autoFocus: boolean
    onFocused: () => void
    onChange: (changes: Partial<Module>) => void
    onDelete: () => void
}

export const ModuleRow = ({
    id,
    module,
    grades,
    autoFocus,
    onFocused,
    onChange,
    onDelete,
}: ModuleRowProps) => (
    <li className={cn("grid items-center gap-1.5 sm:gap-2", MODULE_COLUMNS)}>
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
            className="min-w-0 text-muted-foreground hover:text-destructive"
            aria-label={`Delete ${module.name.trim() || "module"}`}
            onClick={onDelete}>
            <Trash2 />
        </Button>
    </li>
)
