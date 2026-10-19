import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Sparkles, Check, Trash2, CircleSlash, BookPlus, X } from 'lucide-react'

export default function SpellingPopover({ popover, onApplySuggestion, onRemoveWord, onClose }) {
    const popoverRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                onClose()
            }
        }
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [onClose])

    if (!popover || typeof document === 'undefined' || !document.body) return null

    const { word, suggestions = [], isJunk = false, coords } = popover

    return createPortal(
        <AnimatePresence>
            <motion.div
                ref={popoverRef}
                initial={{ opacity: 0, scale: 0.94, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: -4 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                style={{
                    position: 'fixed',
                    top: `${coords.top}px`,
                    left: `${coords.left}px`,
                    zIndex: 99999
                }}
                className="w-56 overflow-hidden rounded-xl border border-black/10 bg-white/95 p-2 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#14141e]/95 text-zinc-900 dark:text-zinc-100"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-1.5 pb-1.5 pt-0.5 border-b border-black/[0.06] dark:border-white/[0.08]">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        <Sparkles size={11} className="text-sky-500" />
                        <span>Spelling</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-[11px] font-mono text-rose-500 max-w-[80px] truncate underline decoration-wavy decoration-rose-500/70">
                            {word}
                        </span>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors cursor-pointer"
                        >
                            <X size={12} />
                        </button>
                    </div>
                </div>

                {/* Suggestions List */}
                <div className="py-1 flex flex-col gap-0.5 max-h-48 overflow-y-auto">
                    {suggestions.length > 0 ? (
                        suggestions.map((suggestion, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => onApplySuggestion(suggestion)}
                                className="group flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[13.5px] font-semibold text-zinc-800 transition-colors hover:bg-sky-500/15 hover:text-sky-600 dark:text-zinc-100 dark:hover:bg-sky-500/20 dark:hover:text-sky-300 cursor-pointer"
                            >
                                <span>{suggestion}</span>
                                <Check size={13} className="opacity-0 transition-opacity group-hover:opacity-100 text-sky-500" />
                            </button>
                        ))
                    ) : (
                        <div className="px-2.5 py-2 text-xs text-zinc-400 dark:text-zinc-500 italic">
                            No direct dictionary match
                        </div>
                    )}

                    {isJunk && (
                        <button
                            type="button"
                            onClick={onRemoveWord}
                            className="group flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                            <Trash2 size={13} />
                            <span>Remove gibberish word</span>
                        </button>
                    )}
                </div>

                {/* Bottom Action Row (like Image 2: Ignore, Keep, Delete) */}
                <div className="flex items-center justify-between border-t border-black/[0.06] pt-1.5 mt-0.5 px-1 dark:border-white/[0.08]">
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={onClose}
                            title="Ignore word"
                            className="rounded p-1 text-zinc-400 hover:bg-black/5 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                        >
                            <CircleSlash size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            title="Keep word in dictionary"
                            className="rounded p-1 text-zinc-400 hover:bg-black/5 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                        >
                            <BookPlus size={14} />
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={onRemoveWord}
                        title="Delete word"
                        className="rounded p-1 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
    )
}
