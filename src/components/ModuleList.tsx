import { KeyboardEvent, PointerEvent, useEffect, useRef } from "react"
import { flushSync } from "react-dom"
import { cn } from "@/lib/utils"
import { Grade } from "../interfaces/Grade"
import { Module } from "../interfaces/Module"
import { ModuleRow } from "./ModuleRow"

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)"
/** How long a finger rests on a row before it picks up, on screens without handles. */
const LONG_PRESS_MS = 400
/** Moving further than this before then is a scroll, not a press. */
const SLOP_PX = 8

interface ModuleListProps {
    id: string
    modules: Module[]
    grades: Record<string, Grade>
    locked: boolean
    focusIndex: number | null
    onFocused: () => void
    onChange: (index: number, changes: Partial<Module>) => void
    onDelete: (index: number) => void
    onMove: (from: number, to: number) => void
}

interface Drag {
    /** Only this pointer moves or drops the row, so a second finger can't. */
    pointerId: number
    index: number
    target: number
    startY: number
    rows: HTMLElement[]
    tops: number[]
    mids: number[]
    /** How far a row moves to make room for the dragged one. */
    step: number
}

interface Press {
    index: number
    pointerId: number
    x: number
    y: number
    timer: number
}

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches
// Matches Tailwind's `sm`, where the handles appear.
const hasHandles = () => matchMedia("(min-width: 40rem)").matches
const blockScroll = (event: TouchEvent) => event.preventDefault()

/**
 * A semester's modules, reordered by dragging. Wider screens drag by a row's
 * handle, phones by pressing and holding the row. A focused handle also moves
 * its row with the arrow keys.
 */
export const ModuleList = ({
    id,
    modules,
    grades,
    locked,
    focusIndex,
    onFocused,
    onChange,
    onDelete,
    onMove,
}: ModuleListProps) => {
    const listRef = useRef<HTMLUListElement>(null)
    const drag = useRef<Drag | null>(null)
    const press = useRef<Press | null>(null)

    const cancelPress = () => {
        if (press.current) clearTimeout(press.current.timer)
        press.current = null
    }

    useEffect(
        () => () => {
            cancelPress()
            removeEventListener("touchmove", blockScroll)
        },
        [],
    )

    const startDrag = (index: number, y: number, capture: Element, pointerId: number) => {
        const list = listRef.current
        if (!list || modules.length < 2 || drag.current) return
        try {
            capture.setPointerCapture(pointerId)
        } catch {
            return // The pointer was already released.
        }
        const rows = [...list.children] as HTMLElement[]
        const rects = rows.map(row => row.getBoundingClientRect())
        const gap = parseFloat(getComputedStyle(list).rowGap) || 0
        // Holding an unfocused field can start a text selection on Android.
        getSelection()?.removeAllRanges()
        drag.current = {
            pointerId,
            index,
            target: index,
            startY: y,
            rows,
            tops: rects.map(rect => rect.top),
            mids: rects.map(rect => rect.top + rect.height / 2),
            step: rects[index].height + gap,
        }
        // Lifted onto its own solid surface, so the rows it passes don't show through.
        rows[index].dataset.dragging = ""
        const shift = reducedMotion() ? "none" : `transform 200ms ${EASE_OUT}`
        rows.forEach((row, i) => {
            if (i !== index) row.style.transition = shift
        })
        // Touch scrolling can't be switched off mid-gesture with CSS.
        addEventListener("touchmove", blockScroll, { passive: false })
    }

    const moveDrag = (pointerId: number, y: number) => {
        const current = drag.current
        if (current?.pointerId !== pointerId) return
        const { index, rows, tops, mids, step } = current
        // Kept within the list, so a row can't be dragged off into another semester.
        const last = rows.length - 1
        const dy = Math.min(Math.max(y - current.startY, tops[0] - tops[index]), tops[last] - tops[index])
        rows[index].style.transform = `translateY(${dy}px)`

        // Passing a row's middle swaps with it. At either end the dragged row's
        // middle lands exactly on the end row's, which still counts.
        const middle = mids[index] + dy
        let target = index
        for (let i = 0; i < index; i++) if (middle <= mids[i]) { target = i; break }
        for (let i = last; i > index; i--) if (middle >= mids[i]) { target = i; break }
        if (target === current.target) return
        current.target = target
        rows.forEach((row, i) => {
            if (i === index) return
            const between = target > index ? i > index && i <= target : i >= target && i < index
            row.style.transform = between ? `translateY(${target > index ? -step : step}px)` : ""
        })
    }

    const endDrag = (pointerId: number, commit: boolean) => {
        const current = drag.current
        if (current?.pointerId !== pointerId) return
        drag.current = null
        removeEventListener("touchmove", blockScroll)
        const { index, rows } = current
        const target = commit ? current.target : index
        const droppedAt = rows[index].getBoundingClientRect().top

        // The other rows already sit where they'll end up, so swapping the order in
        // and dropping their offsets in the same frame doesn't move anything.
        if (target !== index) flushSync(() => onMove(index, target))
        rows.forEach(row => {
            row.style.transition = ""
            row.style.transform = ""
            delete row.dataset.dragging
        })

        // Rows are keyed by position, so the dropped module now lives in row `target`.
        const row = listRef.current?.children[target] as HTMLElement | undefined
        if (!row || reducedMotion()) return
        const offset = droppedAt - row.getBoundingClientRect().top
        if (!offset) return
        row.dataset.dragging = ""
        row
            .animate([{ transform: `translateY(${offset}px)` }, { transform: "translateY(0)" }], {
                duration: 200,
                easing: EASE_OUT,
            })
            .finished.finally(() => delete row.dataset.dragging)
    }

    const rowPointerDown = (index: number, event: PointerEvent<HTMLLIElement>) => {
        if (locked || event.pointerType === "mouse" || hasHandles() || drag.current || press.current) return
        // Holding a field you're already typing in moves the caret or selects text,
        // and the grade picker and delete button have their own presses.
        const target = event.target as Element
        if (target === document.activeElement || target.closest("select, button")) return
        cancelPress()
        const row = event.currentTarget
        const { pointerId, clientX: x, clientY: y } = event
        press.current = {
            index,
            pointerId,
            x,
            y,
            timer: window.setTimeout(() => {
                press.current = null
                startDrag(index, y, row, pointerId)
                if (drag.current) navigator.vibrate?.(10)
            }, LONG_PRESS_MS),
        }
    }

    const rowPointerMove = (event: PointerEvent<HTMLLIElement>) => {
        const pending = press.current
        if (pending?.pointerId === event.pointerId) {
            if (Math.hypot(event.clientX - pending.x, event.clientY - pending.y) > SLOP_PX) cancelPress()
            return
        }
        moveDrag(event.pointerId, event.clientY)
    }

    const rowPointerUp = (event: PointerEvent<HTMLLIElement>, commit: boolean) => {
        if (press.current?.pointerId === event.pointerId) cancelPress()
        endDrag(event.pointerId, commit)
    }

    const moveWithKeys = (index: number, event: KeyboardEvent<HTMLButtonElement>) => {
        const to = event.key === "ArrowUp" ? index - 1 : event.key === "ArrowDown" ? index + 1 : null
        if (to === null) return
        event.preventDefault()
        if (to < 0 || to >= modules.length) return
        flushSync(() => onMove(index, to))
        document.getElementById(`${id}-m${to}-handle`)?.focus()
    }

    return (
        <ul ref={listRef} className={cn("flex flex-col", locked ? "gap-0.5" : "gap-2")}>
            {modules.map((module, index) => (
                <ModuleRow
                    key={index}
                    id={`${id}-m${index}`}
                    module={module}
                    grades={grades}
                    locked={locked}
                    autoFocus={focusIndex === index}
                    onFocused={onFocused}
                    onChange={changes => onChange(index, changes)}
                    onDelete={() => onDelete(index)}
                    rowProps={{
                        onPointerDown: event => rowPointerDown(index, event),
                        onPointerMove: rowPointerMove,
                        onPointerUp: event => rowPointerUp(event, true),
                        onPointerCancel: event => rowPointerUp(event, false),
                        // Fires after a normal release too, by which point the drag has ended.
                        onLostPointerCapture: event => endDrag(event.pointerId, false),
                        // A held row would otherwise open the long-press menu.
                        onContextMenu: event => {
                            if (press.current || drag.current) event.preventDefault()
                        },
                    }}
                    handleProps={{
                        onPointerDown: event => {
                            if (event.button !== 0) return
                            event.preventDefault()
                            startDrag(index, event.clientY, event.currentTarget, event.pointerId)
                        },
                        // Moves and releases bubble up to the row's handlers.
                        onKeyDown: event => moveWithKeys(index, event),
                    }}
                />
            ))}
        </ul>
    )
}
