import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { CalculationData } from "@/interfaces/CalculationData"
import { PasteImport } from "./PasteImport"

interface ImportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** The tab pasted grades import into. */
    systemIndex: number
    onImport: (data: CalculationData) => void
}

export const ImportDialog = ({ open, onOpenChange, systemIndex, onImport }: ImportDialogProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
            <DialogTitle>Import grades</DialogTitle>
            <PasteImport
                systemIndex={systemIndex}
                onImport={data => {
                    onImport(data)
                    onOpenChange(false)
                }}
            />
        </DialogContent>
    </Dialog>
)
