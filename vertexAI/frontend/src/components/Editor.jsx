import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Check, Save, Loader2, Code2 } from 'lucide-react'
import { getFileIcon } from '../utils/customizeIcon'
import { updateFile } from '../features/file'
import MonacoEditor from '@monaco-editor/react'

function Editor({
    activeTab,
    openTabs,
    setOpenTabs,
    setActiveTab,
    reloadTree,
    projectId
}) {
    const [saving, setSaving] = useState(false)
    const [justSaved, setJustSaved] = useState(false)
    const [code, setCode] = useState("")

    useEffect(() => {
        setCode(activeTab?.content || "")
    }, [activeTab])

    const save = async () => {
        if (!activeTab || saving) return
        try {
            setSaving(true)
            await updateFile({ name: activeTab?.name, content: code, id: activeTab?._id })
            setActiveTab({ ...activeTab, content: code })
            setOpenTabs((tabs) => tabs.map((tab) => tab._id == activeTab._id ? { ...tab, content: code } : tab))
            
            // Reload tree for static preview & explorer
            reloadTree?.()

            // Sync to terminal local workspace for Vite dev server HMR
            const terminalUrl = import.meta.env.VITE_TERMINAL_SERVICE_URL || "http://localhost:8005"
            try {
                await fetch(`${terminalUrl}/sync-project`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        projectId: projectId || activeTab?.projectId,
                        userId: activeTab?.owner
                    })
                })
            } catch (syncErr) {
                console.log("disk sync error", syncErr)
            }

            setSaving(false)
            setJustSaved(true)
            setTimeout(() => {
                setJustSaved(false)
            }, 1500)
        } catch (error) {
            setSaving(false)
            console.log(error)
        }
    }

    // Ctrl+S / Cmd+S shortcut
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault()
                save()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [code, activeTab, saving])

    const handleCloseTab = (e, id) => {
        e.stopPropagation()
        const result = openTabs.filter((tab) => tab._id !== id)
        setOpenTabs(result)
        if (activeTab?._id === id) {
            setActiveTab(result.length ? result[result.length - 1] : null)
        }
    }

    if (!activeTab) return (
        <div className='flex flex-1 flex-col items-center justify-center gap-3 bg-[#0a0a0c] text-zinc-600'>
            <div className='flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02]'>
                <Code2 size={22} className="text-zinc-700" />
            </div>
            <div className='flex flex-col items-center gap-1'>
                <span className='text-sm font-medium text-zinc-400'>No File Open</span>
                <span className='text-xs text-zinc-600'>Select a file from Explorer to start editing</span>
            </div>
        </div>
    )

    const { icon: ActiveIcon, color: activeColor } = getFileIcon(activeTab?.name)

    const getLanguage = (fileName) => {
        if (!fileName) return 'javascript'
        const ext = fileName.split('.').pop().toLowerCase()
        if (ext === 'html') return 'html'
        if (ext === 'css') return 'css'
        if (ext === 'json') return 'json'
        if (ext === 'py') return 'python'
        if (ext === 'ts' || ext === 'tsx') return 'typescript'
        return 'javascript'
    }

    return (
        <div className='flex flex-1 flex-col bg-[#0a0a0c] overflow-hidden'>
            <div className='flex h-10 shrink-0 items-center overflow-x-auto border-b border-white/[0.06] bg-[#111113]/90'>
                <AnimatePresence initial={false}>
                    {openTabs.map((tab) => {
                        const active = activeTab?._id === tab?._id
                        const { icon: Icon, color } = getFileIcon(tab?.name)

                        return (
                            <motion.div
                                key={tab?._id}
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.15 }}
                                onClick={() => setActiveTab(tab)}
                                className={`group relative flex h-full cursor-pointer items-center gap-2 whitespace-nowrap border-r border-white/[0.05] px-3.5 transition-colors ${
                                    active ? "bg-[#0a0a0c] text-white" : "text-zinc-500 hover:bg-white/[0.02] hover:text-zinc-300"
                                }`}
                            >
                                <Icon size={14} className={`${color}`} />
                                <span className='text-[13px]'>{tab?.name}</span>

                                <button
                                    className="cursor-pointer rounded p-0.5 text-zinc-500 opacity-0 hover:bg-white/10 hover:text-white group-hover:opacity-100"
                                    onClick={(e) => handleCloseTab(e, tab?._id)}
                                >
                                    <X size={13} />
                                </button>

                                {active && (
                                    <motion.div
                                        className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-sky-400 to-violet-400"
                                        transition={{ duration: 0.2, ease: "easeOut" }}
                                    />
                                )}
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>

            <div className='flex h-10 shrink-0 items-center justify-between border-b border-white/[0.06] px-4'>
                <div className='flex items-center gap-2 text-zinc-400'>
                    <ActiveIcon size={14} className={`${activeColor}`} />
                    <span className='text-[13px]'>{activeTab?.name}</span>
                </div>

                <motion.div
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={save}
                    disabled={saving}
                    className="flex cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-b from-sky-500 to-sky-600 px-3 py-1.5 text-xs font-medium text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset] transition-colors hover:from-sky-400 hover:to-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <AnimatePresence mode="wait">
                        {saving ? (
                            <motion.span
                                key="saving"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-2"
                            >
                                <Loader2 size={13} className="animate-spin" />
                                Saving
                            </motion.span>
                        ) : justSaved ? (
                            <motion.span
                                key="saved"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-2"
                            >
                                <Check size={13} />
                                Saved
                            </motion.span>
                        ) : (
                            <motion.span
                                key="save"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-2"
                            >
                                <Save size={13} />
                                Save
                            </motion.span>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>

            <div className='min-h-0 flex-1'>
                <MonacoEditor
                    height="100%"
                    theme="vs-dark"
                    language={activeTab?.language || getLanguage(activeTab?.name) || "plaintext"}
                    value={code}
                    onChange={(value) => setCode(value || "")}
                    options={{
                        fontSize: 14,
                        automaticLayout: true,
                        minimap: { enabled: false },
                        wordWrap: "on",
                        scrollBeyondLastLine: false,
                        padding: { top: 12 },
                    }}
                />
            </div>
        </div>
    )
}

export default Editor
