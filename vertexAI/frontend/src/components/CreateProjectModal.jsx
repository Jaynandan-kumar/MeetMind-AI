import React, { useState } from 'react'
import { motion } from "motion/react"
import { X, Loader2, Sparkles, Wand2, Check } from 'lucide-react'
import { createProject } from '../features/project'
import { createRootFolder } from '../features/file'
import { useDispatch } from 'react-redux'
import { addNewProject } from '../redux/projectSlice'
import { getSmartNameSuggestions, getSmartDescriptionSuggestions, getWordSpellingSuggestions } from '../utils/nameCorrector'
import { getCaretCoordinates } from '../utils/caretCoordinates'
import SpellingPopover from './SpellingPopover'

function CreateProjectModal({ openModal, open, onClose }) {
    const isOpen = openModal ?? open
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [loading, setLoading] = useState(false)
    const [spellingPopover, setSpellingPopover] = useState(null)
    const dispatch = useDispatch()

    const suggestions = getSmartNameSuggestions(name)
    const descSuggestions = getSmartDescriptionSuggestions(description, name)

    const handleWordCheck = (element, fieldType, currentValue) => {
        if (!element) return
        // Allow tiny delay so cursor position settles on click/contextmenu
        setTimeout(() => {
            const selStart = element.selectionStart
            if (typeof selStart !== 'number') return

            const val = element.value || currentValue || ""
            if (!val || val.trim().length === 0) {
                setSpellingPopover(null)
                return
            }

            // Find boundaries of the word under cursor
            let start = selStart
            if (start > 0 && (start >= val.length || /\s/.test(val[start])) && /[\w'-]/.test(val[start - 1])) {
                start--
            }

            while (start > 0 && /[\w'-]/.test(val[start - 1])) {
                start--
            }
            let end = start
            while (end < val.length && /[\w'-]/.test(val[end])) {
                end++
            }

            const clickedWord = val.slice(start, end).trim()
            if (!clickedWord || clickedWord.length < 2) {
                setSpellingPopover(null)
                return
            }

            const check = getWordSpellingSuggestions(clickedWord)
            if (!check.isMisspelled) {
                setSpellingPopover(null)
                return
            }

            const coords = getCaretCoordinates(element, start)
            setSpellingPopover({
                targetField: fieldType,
                word: clickedWord,
                start,
                end,
                suggestions: check.suggestions || [],
                isJunk: check.isJunk || false,
                coords
            })
        }, 10)
    }

    const handleApplySuggestion = (chosenWord) => {
        if (!spellingPopover) return
        const { targetField, start, end } = spellingPopover
        if (targetField === 'name') {
            const newVal = name.slice(0, start) + chosenWord + name.slice(end)
            setName(newVal)
        } else {
            const newVal = description.slice(0, start) + chosenWord + description.slice(end)
            setDescription(newVal)
        }
        setSpellingPopover(null)
    }

    const handleRemoveWord = () => {
        if (!spellingPopover) return
        const { targetField, start, end } = spellingPopover
        if (targetField === 'name') {
            let after = name.slice(end)
            if (after.startsWith(" ")) after = after.slice(1)
            const newVal = (name.slice(0, start) + after).replace(/\s+/g, " ")
            setName(newVal)
        } else {
            let after = description.slice(end)
            if (after.startsWith(" ")) after = after.slice(1)
            const newVal = (description.slice(0, start) + after).replace(/\s+/g, " ")
            setDescription(newVal)
        }
        setSpellingPopover(null)
    }

    const handleCreateProject = async () => {
        if (!name.trim()) return
        setLoading(true)
        const data = await createProject({ name, description })
        if (data && data._id) {
            await createRootFolder({ projectId: data._id, projectName: data.name })
            onClose()
            dispatch(addNewProject(data))
            setName("")
            setDescription("")
        }
        setLoading(false)
    }

    if (!isOpen) return null

    return (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
            <motion.div
                onClick={onClose}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="fixed inset-0 bg-black/20 backdrop-blur-sm dark:bg-black/60 cursor-pointer"
            />

            <div className='pointer-events-none absolute -z-10 h-[460px] w-[460px] rounded-full blur-[130px] dark:bg-sky-500/10' />

            <motion.div
                initial={{
                    opacity: 0,
                    y: 10,
                    scale: 0.98,
                }}
                animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                }}
                exit={{
                    opacity: 0,
                    y: 10,
                    scale: 0.98,
                }}
                transition={{
                    duration: 0.28,
                    ease: [0.16, 1, 0.3, 1],
                }}
                className="relative w-full max-w-lg rounded-2xl border border-black/[0.08] bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#0c0c14] overflow-hidden"
            >
                <div className='pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/30' />

                <div className='flex items-center justify-between border-b border-black/[0.06] px-5 py-4 sm:px-7 sm:py-6 dark:border-white/[0.08]'>
                    <div>
                        <h2 className='text-[17px] font-semibold tracking-tight text-zinc-900 dark:text-white'>Create Project</h2>
                        <p className='text-xs text-zinc-500 dark:text-zinc-400'>Set up a new workspace in seconds</p>
                    </div>
                    <button
                        onClick={onClose}
                        className='rounded-lg p-2 text-zinc-500 transition-colors hover:bg-black/[0.05] hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.07] dark:hover:text-white cursor-pointer'
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className='space-y-5 sm:space-y-6 px-5 py-5 sm:px-7 sm:py-6'>
                    <div>
                        <div className='mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
                            <span>Project Name</span>
                            {suggestions.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setName(suggestions[0])}
                                    className="flex items-center gap-1 text-[11.5px] font-medium text-sky-500 hover:text-sky-400 transition-colors normal-case cursor-pointer"
                                >
                                    <Sparkles size={12} />
                                    <span>Fix: {suggestions[0]}</span>
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <input
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value)
                                    setSpellingPopover(null)
                                }}
                                onClick={(e) => handleWordCheck(e.target, 'name', e.target.value)}
                                onKeyUp={(e) => handleWordCheck(e.target, 'name', e.target.value)}
                                onContextMenu={(e) => handleWordCheck(e.target, 'name', e.target.value)}
                                spellCheck="true"
                                placeholder="My Awesome Project"
                                autoFocus
                                className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-3 pr-10 text-[15px] text-zinc-900 placeholder-zinc-400 outline-none transition-all focus:border-sky-400/60 focus:bg-white focus:ring-4 focus:ring-sky-400/15 dark:border-white/[0.09] dark:bg-white/[0.04] dark:text-white dark:placeholder-zinc-500 dark:focus:bg-white/[0.06] dark:focus:ring-sky-400/20"
                            />
                            {suggestions.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setName(suggestions[0])}
                                    title={`Click to auto-correct to "${suggestions[0]}"`}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-sky-500 hover:bg-sky-500/10 transition-colors cursor-pointer"
                                >
                                    <Wand2 size={16} />
                                </button>
                            )}
                        </div>

                        {suggestions.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-2.5 flex flex-wrap items-center gap-1.5"
                            >
                                <span className="flex items-center gap-1 text-[11.5px] font-medium text-sky-500 dark:text-sky-400 mr-0.5">
                                    <Sparkles size={12} />
                                    <span>Suggested:</span>
                                </span>
                                {suggestions.map((s, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setName(s)}
                                        className="group flex items-center gap-1 rounded-lg border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-[12px] font-medium text-sky-600 transition-all hover:border-sky-500/50 hover:bg-sky-500/20 dark:text-sky-300 dark:hover:text-white cursor-pointer shadow-sm"
                                    >
                                        <span>{s}</span>
                                        <Check size={11} className="opacity-0 transition-opacity group-hover:opacity-100 text-sky-400" />
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </div>

                    <div>
                        <div className='mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
                            <span>Description</span>
                            {descSuggestions.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setDescription(descSuggestions[0])}
                                    className="flex items-center gap-1 text-[11.5px] font-medium text-sky-500 hover:text-sky-400 transition-colors normal-case cursor-pointer"
                                >
                                    <Sparkles size={12} />
                                    <span>Fix: {descSuggestions[0].length > 30 ? descSuggestions[0].slice(0, 30) + '...' : descSuggestions[0]}</span>
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <textarea
                                value={description}
                                onChange={(e) => {
                                    setDescription(e.target.value)
                                    setSpellingPopover(null)
                                }}
                                onClick={(e) => handleWordCheck(e.target, 'description', e.target.value)}
                                onKeyUp={(e) => handleWordCheck(e.target, 'description', e.target.value)}
                                onContextMenu={(e) => handleWordCheck(e.target, 'description', e.target.value)}
                                spellCheck="true"
                                rows={3}
                                placeholder="What is this project about?"
                                className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-3 pr-10 text-[15px] text-zinc-900 placeholder-zinc-400 outline-none transition-all focus:border-sky-400/60 focus:bg-white focus:ring-4 focus:ring-sky-400/15 dark:border-white/[0.09] dark:bg-white/[0.04] dark:text-white dark:placeholder-zinc-500 dark:focus:bg-white/[0.06] dark:focus:ring-sky-400/20 resize-none"
                            />
                            {descSuggestions.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setDescription(descSuggestions[0])}
                                    title={`Click to auto-correct description to "${descSuggestions[0]}"`}
                                    className="absolute right-3 top-3 rounded-lg p-1.5 text-sky-500 hover:bg-sky-500/10 transition-colors cursor-pointer"
                                >
                                    <Wand2 size={16} />
                                </button>
                            )}
                        </div>

                        {descSuggestions.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-2.5 flex flex-col gap-1.5"
                            >
                                <span className="flex items-center gap-1 text-[11.5px] font-medium text-sky-500 dark:text-sky-400">
                                    <Sparkles size={12} />
                                    <span>Suggested Descriptions:</span>
                                </span>
                                {descSuggestions.map((s, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setDescription(s)}
                                        className="group flex items-start justify-between text-left gap-2 rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 py-1.5 text-[12px] font-medium text-sky-700 transition-all hover:border-sky-500/50 hover:bg-sky-500/20 dark:text-sky-300 dark:hover:text-white cursor-pointer shadow-sm"
                                    >
                                        <span className="line-clamp-2">{s}</span>
                                        <Check size={13} className="shrink-0 mt-0.5 opacity-0 transition-opacity group-hover:opacity-100 text-sky-400" />
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </div>
                </div>

                <div className='flex items-center justify-end gap-2.5 sm:gap-3 border-t border-black/[0.06] px-5 py-4 sm:px-7 sm:py-5 dark:border-white/[0.08]'>
                    <button
                        onClick={onClose}
                        className="rounded-xl border border-black/[0.08] bg-black/[0.02] px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-black/[0.05] hover:text-zinc-900 dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-zinc-300 dark:hover:bg-white/[0.07] dark:hover:text-white cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreateProject}
                        disabled={loading}
                        className="flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_8px_24px_-8px_rgba(0,0,0,0.4)] transition-all hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 cursor-pointer"
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        {loading ? "Creating..." : "Create Project"}
                    </button>
                </div>
            </motion.div>

            <SpellingPopover
                popover={spellingPopover}
                onApplySuggestion={handleApplySuggestion}
                onRemoveWord={handleRemoveWord}
                onClose={() => setSpellingPopover(null)}
            />
        </div>
    )
}

export default CreateProjectModal
