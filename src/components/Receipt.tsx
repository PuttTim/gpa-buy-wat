import { useState } from "react"
import { foodFor } from "@/lib/food"
import { GradingSystem } from "@/lib/systems"
import { encodeCode39 } from "@/lib/code39"
import { CalculationData } from "../interfaces/CalculationData"
import { calculateGPA, creditsIn } from "@/lib/calculation"

interface ReceiptProps {
    ref?: React.Ref<HTMLElement>
    system: GradingSystem
    data: CalculationData
    credits: number
    gpa: number | null
    prompt: string
    /** Overrides the GPA barcode once these grades can be imported elsewhere. */
    barcode?: string | null
}

const LINE = "grid grid-cols-[minmax(0,1fr)_7ch_3ch] gap-x-2"
const RULE = "border-t border-dashed border-paper-ink/60"

const formatGPA = (gpa: number | null) => (gpa === null ? "-" : gpa.toFixed(2))

const printedAt = () => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    return {
        date: `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`,
        time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    }
}

export const Receipt = ({ ref, system, data, credits, gpa, prompt, barcode: transfer }: ReceiptProps) => {
    const [printed] = useState(printedAt)
    const food = gpa === null ? null : foodFor(gpa)
    // While this tab can't be reached for import, the barcode shows the system, GPA and credits.
    const barcodeValue =
        transfer ?? [system.name, ...(gpa === null ? [] : [gpa.toFixed(2), credits])].join("-")
    const barcode = encodeCode39(barcodeValue)

    return (
        <div className="receipt-shadow relative z-20 min-w-0 lg:sticky lg:top-6 lg:mt-14">
            <section
                ref={ref}
                aria-label="Receipt"
                className="receipt scroll-mt-16 bg-paper px-5 pt-3 pb-8 lg:scroll-mt-6 lg:pt-8 font-mono text-[13px] leading-5 text-paper-ink uppercase lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto">
                <div className="text-center">
                    <p className="text-lg leading-7">GPA buy what?</p>
                    <p>{system.name}</p>
                </div>
                <div className="mt-3 flex justify-between text-paper-faint">
                    <span>{printed.date}</span>
                    <span>{printed.time}</span>
                </div>

                <div className={`mt-3 ${RULE} pt-2 ${LINE} text-paper-faint`}>
                    <span>Item</span>
                    <span className="text-right">GPA</span>
                    <span className="text-right">Cr</span>
                </div>

                {data.totalCredits > 0 && (
                    <div className={`mt-2 ${LINE}`}>
                        <span className="truncate">So far</span>
                        <span className="text-right">
                            {formatGPA(parseFloat(data.currentGPA) || 0)}
                        </span>
                        <span className="text-right">{data.totalCredits}</span>
                    </div>
                )}

                {data.semesters.map((semester, semesterIndex) => (
                    <div key={semesterIndex} className="mt-2">
                        <div className={LINE}>
                            <span className="truncate">{semester.name}</span>
                            <span className="text-right">
                                {formatGPA(calculateGPA(semester.modules))}
                            </span>
                            <span className="text-right">
                                {creditsIn(semester.modules)}
                            </span>
                        </div>
                    </div>
                ))}

                <div className={`mt-3 ${RULE} flex justify-between pt-2`}>
                    <span>Credits</span>
                    <span>{credits}</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between border-b-4 border-double border-paper-ink/70 pb-2 text-lg leading-7">
                    <span>Total GPA</span>
                    <span>{formatGPA(gpa)}</span>
                </div>

                <div aria-live="polite" className="mt-5 flex flex-col items-center gap-2 text-center">
                    {food ? (
                        <>
                            <img
                                src={food.icon}
                                alt=""
                                className="size-24 [image-rendering:pixelated]"
                            />
                            <p>You can buy</p>
                            <p className="text-lg leading-7">{food.name}</p>
                        </>
                    ) : (
                        <p>{prompt}</p>
                    )}
                </div>

                <div className={`mt-5 ${RULE} pt-4 text-center`}>
                    <svg
                        role="img"
                        aria-label={`Barcode: ${barcodeValue}`}
                        viewBox={`0 0 ${barcode.width} 1`}
                        preserveAspectRatio="none"
                        shapeRendering="crispEdges"
                        className="h-12 w-full fill-paper-ink">
                        {barcode.bars.map(([x, width]) => (
                            <rect key={x} x={x} width={width} height={1} />
                        ))}
                    </svg>
                    <p className="mt-1 text-paper-faint">{barcodeValue}</p>
                    <a
                        className="mt-3 block normal-case hover:underline"
                        href="https://gpabuywhat.com"
                        target="_blank"
                        rel="noreferrer">
                        gpabuywhat.com
                    </a>
                </div>
            </section>
        </div>
    )
}
