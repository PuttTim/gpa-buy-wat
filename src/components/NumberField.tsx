import { Input } from "@/components/ui/input"

interface NumberFieldProps {
    id: string
    value: string
    onChange: (value: string) => void
    placeholder: string
    max: number
}

export const NumberField = ({
    id,
    value,
    onChange,
    placeholder,
    max,
}: NumberFieldProps) => (
    <Input
        id={id}
        className="px-2 font-mono sm:px-3"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={e => {
            const next = e.target.value
            if (!/^\d*$/.test(next)) return
            onChange(parseFloat(next) > max ? String(max) : next)
        }}
    />
)
