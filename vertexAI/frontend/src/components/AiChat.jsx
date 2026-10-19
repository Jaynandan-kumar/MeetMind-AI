import { FileMinus, FilePen, FilePlus2, FolderPlus, Send, Sparkles, Loader2, Wrench, CheckCircle2, User, Bot } from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from "motion/react"
import { useDispatch } from 'react-redux'
import { updateProjectDetails } from '../redux/projectSlice'
import { getWordSpellingSuggestions } from '../utils/nameCorrector'
import { getCaretCoordinates } from '../utils/caretCoordinates'
import SpellingPopover from './SpellingPopover'

const TOOL_META = {
    folder_created: { icon: FolderPlus, color: "text-sky-400", label: "Created folder" },
    file_created: { icon: FilePlus2, color: "text-emerald-400", label: "Created file" },
    file_updated: { icon: FilePen, color: "text-amber-400", label: "Updated file" },
    file_deleted: { icon: FileMinus, color: "text-red-400", label: "File deleted" },
    project_updated: { icon: Sparkles, color: "text-purple-400", label: "Updated project description" },
};

const ToolBadge = ({ toolType, detail }) => {
    const meta = TOOL_META[toolType]
    if (!meta) return null;
    const Icon = meta.icon
    let detailText = typeof detail === "object" ? (detail?.file?.name || detail?.folder?.name || detail?.name || detail?.fileId || "") : detail

    if (toolType === "project_updated") {
        detailText = ""
    } else if (typeof detailText === "string" && detailText.length > 35) {
        detailText = detailText.slice(0, 32) + "..."
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center my-1"
        >
            <div className='flex max-w-[92%] items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11.5px] text-zinc-400'>
                <Icon size={13} className={`${meta.color} shrink-0`} />
                <span className="shrink-0">{meta.label}</span>
                {detailText && <span className='truncate text-zinc-500'>&middot; {detailText}</span>}
            </div>
        </motion.div>
    )
}

function AiChat({ projectId, history = [], reloadTree, width = 340 }) {
    const [messages, setMessages] = useState([])
    const [message, setMessage] = useState("")
    const [loading, setLoading] = useState(false)
    const [currentAction, setCurrentAction] = useState("")
    const [spellingPopover, setSpellingPopover] = useState(null)
    const messagesEndRef = useRef(null)
    const dispatch = useDispatch()

    const handleWordCheck = (element, currentValue) => {
        if (!element) return false
        setTimeout(() => {
            const selStart = element.selectionStart
            if (typeof selStart !== 'number') return

            const val = element.value || currentValue || ""
            if (!val || val.trim().length === 0) {
                setSpellingPopover(null)
                return
            }

            let start = selStart
            // If cursor is at space or end of text, step back 1 to capture the word right before it
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
                targetField: 'chat',
                word: clickedWord,
                start,
                end,
                suggestions: check.suggestions || [],
                isJunk: check.isJunk || false,
                coords
            })
        }, 10)
        return true
    }

    const handleApplySuggestion = (chosenWord) => {
        if (!spellingPopover) return
        const { start, end } = spellingPopover
        const newVal = message.slice(0, start) + chosenWord + message.slice(end)
        setMessage(newVal)
        setSpellingPopover(null)
    }

    const handleRemoveWord = () => {
        if (!spellingPopover) return
        const { start, end } = spellingPopover
        let after = message.slice(end)
        if (after.startsWith(" ")) after = after.slice(1)
        const newVal = (message.slice(0, start) + after).replace(/\s+/g, " ")
        setMessage(newVal)
        setSpellingPopover(null)
    }

    const syncToDisk = async () => {
        const terminalUrl = import.meta.env.VITE_TERMINAL_SERVICE_URL || "http://localhost:8005"
        try {
            await fetch(`${terminalUrl}/sync-project`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId })
            })
        } catch (err) {
            console.log("syncToDisk err", err)
        }
    }

    const onEvent = async (toolType, data) => {
        if (toolType == "start") {
            setCurrentAction("AI is thinking...")
            return
        }

        if (toolType == "tool_start") {
            const tool = data.tool
            if (tool == "get_tree") setCurrentAction("Analyzing project structure...")
            else if (tool == "create_file") setCurrentAction(`Creating ${data.args?.name || "file"}...`)
            else if (tool == "update_file") setCurrentAction(`Updating ${data.args?.name || "file"}...`)
            else if (tool == "delete_file") setCurrentAction(`Deleting ${data.args?.name || "file"}...`)
            else if (tool == "create_folder") setCurrentAction(`Creating folder ${data.args?.name || ""}...`)
            else if (tool == "update_project_description") setCurrentAction("Updating project description...")
            else setCurrentAction(`Running ${tool}...`)
            return
        }

        if (toolType == "file_created") {
            reloadTree?.()
            syncToDisk()
            setCurrentAction(`Created ${data.file?.name || "file"}`)
            setMessages((prev) => [...prev, { role: "tool", toolType: "file_created", detail: data.file?.name }])
        }
        if (toolType == "file_updated") {
            reloadTree?.()
            syncToDisk()
            setCurrentAction(`Updated ${data.file?.name || "file"}`)
            setMessages((prev) => [...prev, { role: "tool", toolType: "file_updated", detail: data.file?.name }])
        }
        if (toolType == "file_deleted") {
            reloadTree?.()
            syncToDisk()
            setCurrentAction(`Deleted ${data.file?.name || "file"}`)
            setMessages((prev) => [...prev, { role: "tool", toolType: "file_deleted", detail: data.file?.name }])
        }
        if (toolType == "folder_created") {
            reloadTree?.()
            syncToDisk()
            setCurrentAction(`Created folder ${data.folder?.name || ""}`)
            setMessages((prev) => [...prev, { role: "tool", toolType: "folder_created", detail: data.folder?.name }])
        }
        if (toolType == "project_updated") {
            setCurrentAction("Updated project description")
            if (data.project) {
                dispatch(updateProjectDetails(data.project))
            }
            setMessages((prev) => [...prev, { role: "tool", toolType: "project_updated" }])
        }
        if (toolType == "message") {
            setCurrentAction("Writing response...")
            const content = data?.content;
            if (!content) return;
            setMessages((prev) => {
                let copy = [...prev]
                let last = copy[copy.length - 1]
                if (last?.role == "assistant") {
                    copy[copy.length - 1] = { ...last, content }
                } else {
                    copy.push({ role: "assistant", content })
                }
                return copy
            })
            return;
        }

        if (toolType == "done") {
            setCurrentAction("")
            setLoading(false)
            return
        }

        if (toolType == "error") {
            throw new Error(data.message || "Ai error")
        }
    }

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, loading])

    const handleChat = async () => {
        if (!message.trim() || loading) return
        setLoading(true)
        setCurrentAction("AI is thinking...")
        try {
            setMessages((prev) => [...prev, { role: "user", content: message }])
            let msg = message
            setMessage("")
            history = messages
            const sessionId = localStorage.getItem("vertex_session_id") || localStorage.getItem("token") || ""
            const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/ai/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "text/event-stream",
                    ...(sessionId ? {
                        "Authorization": `Bearer ${sessionId}`,
                        "x-session-id": sessionId
                    } : {})
                },
                credentials: 'include',
                body: JSON.stringify({
                    projectId,
                    msg,
                    message: msg,
                    history
                })
            })

            if (!response.ok) {
                let msg = "Ai Request Failed"
                try {
                    const data = await response.json()
                    msg = data?.message || msg
                } catch { }
                throw new Error(msg)
            }

            if (!response.body) {
                throw new Error("AI streaming is not supported.")
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ""

            try {
                while (true) {
                    const { value, done } = await reader.read()
                    if (done) break

                    buffer += decoder.decode(value, { stream: true })
                    const events = buffer.split("\n\n")
                    buffer = events.pop() || ""

                    for (const eventText of events) {
                        if (!eventText.trim()) {
                            continue
                        }

                        let eventType = "message"
                        let dataText = ""

                        for (const line of eventText.split("\n")) {
                            if (line.startsWith("event:")) {
                                eventType = line.slice(6).trim()
                            }
                            if (line.startsWith("data:")) {
                                dataText += line.slice(5).trim()
                            }
                        }

                        if (!dataText) {
                            continue
                        }

                        let data;
                        try {
                            data = JSON.parse(dataText)
                        } catch (error) {
                            data = {
                                content: dataText
                            }
                        }

                        onEvent(eventType, data)

                        console.log("eventType", eventType)
                        console.log("data", data)
                    }
                }
            } finally {
                reader.releaseLock()
            }
        } catch (error) {
            console.log(error)
            setMessages((prev) => [...prev, { role: "assistant", content: error?.message || "AI request failed.", error: true }])
            return null
        }
        finally {
            syncToDisk()
            setCurrentAction("")
            setLoading(false)
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleChat()
        }
    }

    const chatWords = message.trim().split(/\s+/).filter(Boolean)
    const firstMisspelled = chatWords
        .map(w => ({ word: w, check: getWordSpellingSuggestions(w) }))
        .find(item => item.check.isMisspelled && item.check.suggestions.length > 0)

    return (
        <div
            style={{ width: `${width}px` }}
            className='flex shrink-0 flex-col border-l border-white/[0.06] bg-[#111113]/90 backdrop-blur-xl'
        >
            <div className='flex h-10 shrink-0 items-center justify-between border-b border-white/[0.06] px-3'>
                <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-sky-400" />
                    <span className='text-xs font-semibold tracking-wider text-zinc-300'>VertexAI Chat</span>
                </div>
                {loading && (
                    <div className="flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-400">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500"></span>
                        </span>
                        <span>Working...</span>
                    </div>
                )}
            </div>

            <div className='flex-1 space-y-3 overflow-y-auto p-3'>
                {messages.length === 0 && (
                    <div className='mt-10 text-center'>
                        <div className='mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02]'>
                            <Sparkles size={22} className="text-zinc-600" />
                        </div>
                        <p className='text-sm font-medium text-zinc-400'>What do you want to build?</p>
                        <p className='mt-1.5 text-xs text-zinc-600'>Ask me to create or modify files.</p>
                    </div>
                )}

                <AnimatePresence initial={false}>
                    {messages.map((msg, i) => {
                        if (msg.role == "tool") {
                            return (
                                <ToolBadge key={i} toolType={msg.toolType} detail={msg.detail} />
                            )
                        }

                        const isUser = msg.role == "user"
                        return (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.15 }}
                                className={`flex items-start gap-2 ${isUser ? "flex-row-reverse" : ""}`}
                            >
                                <div
                                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                                        isUser
                                            ? "bg-white/10 text-zinc-300"
                                            : "bg-gradient-to-br from-sky-400 to-violet-400 text-white"
                                    }`}
                                >
                                    {isUser ? <User size={12} /> : <Bot size={12} />}
                                </div>

                                <div
                                    className={`max-w-[85%] rounded-xl px-3 py-2 text-[13px] ${
                                        isUser
                                            ? "bg-gradient-to-b from-sky-500 to-sky-600 text-white"
                                            : msg.error
                                            ? "border border-red-500/20 bg-red-500/10 text-red-300"
                                            : "border border-white/[0.06] bg-white/[0.03] text-zinc-300"
                                    }`}
                                >
                                    <p className='whitespace-pre-wrap leading-relaxed'>{msg.content}</p>
                                </div>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>

                {loading && (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-2.5"
                    >
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-violet-500 text-white shadow-md shadow-sky-500/20">
                            <Bot size={13} />
                        </div>

                        <div className="flex flex-col gap-1 rounded-2xl border border-sky-500/25 bg-sky-500/[0.08] px-3.5 py-2.5 shadow-sm shadow-sky-500/10 backdrop-blur-md">
                            <div className="flex items-center gap-2 text-[12.5px] font-medium text-sky-200">
                                <Loader2 size={14} className="animate-spin text-sky-400" />
                                <span>{currentAction || "AI is working..."}</span>
                                <span className="inline-flex tracking-widest text-sky-400 font-bold">
                                    <span className="animate-pulse">.</span>
                                    <span className="animate-pulse delay-100">.</span>
                                    <span className="animate-pulse delay-200">.</span>
                                </span>
                            </div>
                            <span className="text-[10.5px] text-zinc-400">Generating code & updating project files</span>
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-white/[0.06] p-3">
                <div className='flex items-end gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] p-2 transition-colors focus-within:border-sky-400/40'>
                    <textarea
                        placeholder={loading ? "AI is working on your code..." : "Ask AI to build something... (Enter to send)"}
                        rows={2}
                        value={message}
                        onChange={(e) => {
                            setMessage(e.target.value)
                            setSpellingPopover(null)
                        }}
                        onClick={(e) => handleWordCheck(e.target, e.target.value)}
                        onKeyUp={(e) => handleWordCheck(e.target, e.target.value)}
                        onContextMenu={(e) => handleWordCheck(e.target, e.target.value)}
                        onKeyDown={handleKeyDown}
                        spellCheck="true"
                        disabled={loading}
                        className="flex-1 resize-none bg-transparent text-[13px] text-zinc-200 outline-none placeholder:text-zinc-600 disabled:opacity-50"
                    />

                    {firstMisspelled && (
                        <button
                            type="button"
                            onClick={() => {
                                const chosen = firstMisspelled.check.suggestions[0]
                                setMessage(prev => prev.replace(firstMisspelled.word, chosen))
                            }}
                            title={`Click to fix "${firstMisspelled.word}" to "${firstMisspelled.check.suggestions[0]}"`}
                            className="flex h-8 items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/10 px-2 text-[11px] font-medium text-sky-400 hover:bg-sky-500/20 hover:text-white transition-colors cursor-pointer shrink-0"
                        >
                            <Sparkles size={12} />
                            <span>Fix: {firstMisspelled.check.suggestions[0]}</span>
                        </button>
                    )}

                    <motion.button
                        onClick={handleChat}
                        whileHover={{ scale: loading ? 1 : 1.05 }}
                        whileTap={{ scale: loading ? 1 : 0.95 }}
                        disabled={loading}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-b from-sky-500 to-sky-600 text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset] transition-opacity hover:from-sky-400 hover:to-sky-500 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                    >
                        {loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={14} />}
                    </motion.button>
                </div>
            </div>

            <SpellingPopover
                popover={spellingPopover}
                onApplySuggestion={handleApplySuggestion}
                onRemoveWord={handleRemoveWord}
                onClose={() => setSpellingPopover(null)}
            />
        </div>
    )
}

export default AiChat
