import React, { useState, useEffect } from 'react'
import TopBar from '../components/TopBar'
import ActivityBar from '../components/ActivityBar'
import Explorer from '../components/Explorer'
import Preview from '../components/Preview'
import Editor from '../components/Editor'
import BottomPanel from '../components/BottomPanel'
import AiChat from '../components/AiChat'
import { AnimatePresence, motion } from "motion/react"
import { useParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { setCurrentProject } from '../redux/projectSlice'
import { getProjectById } from '../features/project'
import { getTree } from '../features/file'
import { Code2, Eye, Maximize2, Minimize2, Files, Bot, TerminalSquare } from 'lucide-react'

function ProjectPage() {
    const { id } = useParams()
    const [showExplorer, setShowExplorer] = useState(true)
    const [showAiChat, setShowAiChat] = useState(true)
    const [showTerminal, setShowTerminal] = useState(true)
    const [showPreview, setShowPreview] = useState(false)
    const [isPreviewFullScreen, setIsPreviewFullScreen] = useState(false)
    const [tree, setTree] = useState([])
    const [mobilePane, setMobilePane] = useState("explorer")
    const [openTabs, setOpenTabs] = useState([])
    const [activeTab, setActiveTab] = useState(null)
    const [showBottomPanel, setShowBottomPanel] = useState(true)
    const [explorerWidth, setExplorerWidth] = useState(260)
    const [chatWidth, setChatWidth] = useState(360)
    const [terminalHeight, setTerminalHeight] = useState(260)
    const dispatch = useDispatch()

    const startResizing = (cursor, onMove) => {
        const overlay = document.createElement("div")
        overlay.style.position = "fixed"
        overlay.style.inset = "0"
        overlay.style.zIndex = "99999"
        overlay.style.cursor = cursor
        overlay.style.userSelect = "none"
        document.body.appendChild(overlay)

        const handleMove = (e) => {
            onMove(e)
        }

        const handleUp = () => {
            overlay.remove()
            window.removeEventListener("mousemove", handleMove)
            window.removeEventListener("mouseup", handleUp)
        }

        window.addEventListener("mousemove", handleMove)
        window.addEventListener("mouseup", handleUp)
    }

    const handleExplorerMouseDown = (e) => {
        e.preventDefault()
        const startX = e.clientX
        const startW = explorerWidth
        startResizing("col-resize", (moveEvent) => {
            const delta = moveEvent.clientX - startX
            const newW = Math.max(160, Math.min(500, startW + delta))
            setExplorerWidth(newW)
        })
    }

    const handleChatMouseDown = (e) => {
        e.preventDefault()
        const startX = e.clientX
        const startW = chatWidth
        startResizing("col-resize", (moveEvent) => {
            const delta = startX - moveEvent.clientX
            const newW = Math.max(260, Math.min(750, startW + delta))
            setChatWidth(newW)
        })
    }

    const handleTerminalMouseDown = (e) => {
        e.preventDefault()
        const startY = e.clientY
        const startH = terminalHeight
        startResizing("row-resize", (moveEvent) => {
            const delta = startY - moveEvent.clientY
            const maxH = Math.max(300, window.innerHeight * 0.75)
            const newH = Math.max(120, Math.min(maxH, startH + delta))
            setTerminalHeight(newH)
        })
    }

    const handleGetProject = async () => {
        const data = await getProjectById(id)
        dispatch(setCurrentProject(data))
    }

    const loadTree = async () => {
        const data = await getTree(id)
        if (Array.isArray(data)) {
            setTree(data)
        } else {
            setTree([])
        }
    }

    useEffect(() => {
        handleGetProject()
        loadTree()
    }, [id])

    const openFile = (file) => {
        const exist = openTabs.find(tab => tab._id == file._id)
        if (!exist) setOpenTabs(prev => [...prev, file])
        setActiveTab(file)
        setShowPreview(false)
    }

    return (
        <div className='relative flex h-screen flex-col overflow-hidden bg-[#0a0a0c]'>
            <div className='pointer-events-none absolute -top-40 left-1/3 h-96 w-96 rounded-full bg-sky-500/10 blur-[140px]' />
            <div className='pointer-events-none absolute -top-20 right-1/4 h-80 w-80 rounded-full bg-violet-500/10 blur-[140px]' />
            <TopBar
                showPreview={showPreview}
                setShowPreview={setShowPreview}
            />

            <div className='flex flex-1 overflow-hidden'>
                <div className='hidden md:block'>
                    <ActivityBar
                        showAiChat={showAiChat}
                        showExplorer={showExplorer}
                        showTerminal={showBottomPanel}
                        setShowAiChat={setShowAiChat}
                        setShowExplorer={setShowExplorer}
                        setShowTerminal={setShowBottomPanel}
                    />
                </div>

                <div className={`${mobilePane === "explorer" ? "flex" : "hidden"} w-full md:flex md:w-auto`}>
                    <AnimatePresence initial={false}>
                        {showExplorer && (
                            <Explorer
                                projectId={id}
                                tree={tree}
                                reloadTree={loadTree}
                                openFile={openFile}
                                width={explorerWidth}
                            />
                        )}
                    </AnimatePresence>
                </div>

                {showExplorer && (
                    <div
                        onMouseDown={handleExplorerMouseDown}
                        title="Drag to resize Explorer"
                        className="group relative w-1.5 cursor-col-resize bg-transparent hover:bg-sky-500/40 active:bg-sky-500 transition-colors z-30 hidden md:flex items-center justify-center shrink-0 -mx-[3px]"
                    >
                        <div className="w-[2px] h-8 rounded-full bg-white/20 group-hover:bg-sky-400 group-active:bg-sky-400 transition-colors" />
                    </div>
                )}

                <div className={`${mobilePane === "editor" ? "flex" : "hidden"} relative w-full min-w-0 flex-1 flex-col overflow-hidden border-x border-white/[0.05] md:flex`}>
                    <div className='pointer-events-none absolute right-2 top-2 z-40 flex items-center gap-1.5 sm:right-4 sm:top-3 sm:gap-2'>
                        {showPreview && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                type="button"
                                onClick={() => setIsPreviewFullScreen(v => !v)}
                                title={isPreviewFullScreen ? "Exit fullscreen" : "Fullscreen preview"}
                                className="pointer-events-auto flex items-center justify-center rounded-lg border border-white/10 bg-[#111113]/95 p-1.5 text-zinc-400 shadow-lg shadow-black/40 backdrop-blur hover:text-white sm:p-2 cursor-pointer"
                            >
                                {isPreviewFullScreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                            </motion.button>
                        )}

                        <div className="pointer-events-auto flex items-center gap-0.5 rounded-lg border border-white/10 bg-[#111113]/95 p-1 shadow-lg shadow-black/40 backdrop-blur">
                            <button
                                onClick={() => {
                                    setShowPreview(false);
                                    setIsPreviewFullScreen(false);
                                }}
                                className={`relative flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors sm:px-3 sm:py-1.5 sm:text-xs ${
                                    !showPreview ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                                } cursor-pointer`}
                            >
                                {!showPreview && (
                                    <motion.div
                                        layoutId="tab"
                                        className="absolute inset-0 rounded-md bg-gradient-to-b from-zinc-700 to-zinc-800"
                                        transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                                    />
                                )}
                                <Code2 size={13} className="relative" />
                                <span className='relative hidden sm:inline'>Editor</span>
                            </button>

                            <button
                                onClick={() => setShowPreview(true)}
                                className={`relative flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors sm:px-3 sm:py-1.5 sm:text-xs ${
                                    showPreview ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                                } cursor-pointer`}
                            >
                                {showPreview && (
                                    <motion.div
                                        layoutId="tab"
                                        className="absolute inset-0 rounded-md bg-gradient-to-b from-zinc-700 to-zinc-800"
                                        transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                                    />
                                )}
                                <Eye size={13} className="relative" />
                                <span className='relative hidden sm:inline'>Preview</span>
                            </button>
                        </div>
                    </div>

                    <div className='flex min-h-0 flex-1 overflow-hidden'>
                        {showPreview ? (
                            <Preview tree={tree} />
                        ) : (
                            <Editor
                                activeTab={activeTab}
                                openTabs={openTabs}
                                setOpenTabs={setOpenTabs}
                                setActiveTab={setActiveTab}
                                reloadTree={loadTree}
                                projectId={id}
                            />
                        )}
                    </div>

                    {showBottomPanel && (
                        <div
                            onMouseDown={handleTerminalMouseDown}
                            title="Drag to resize Terminal"
                            className="group relative h-2 w-full cursor-row-resize bg-transparent hover:bg-sky-500/40 active:bg-sky-500 transition-colors z-30 flex items-center justify-center shrink-0 -my-1"
                        >
                            <div className="h-[2px] w-12 rounded-full bg-white/20 group-hover:bg-sky-400 group-active:bg-sky-400 transition-colors" />
                        </div>
                    )}

                    <AnimatePresence>
                        {showBottomPanel && (
                            <div className='shrink-0'>
                                <BottomPanel
                                    projectId={id}
                                    height={terminalHeight}
                                    onClose={() => setShowBottomPanel(false)}
                                />
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {showAiChat && (
                    <div
                        onMouseDown={handleChatMouseDown}
                        title="Drag to resize AI Chat"
                        className="group relative w-1.5 cursor-col-resize bg-transparent hover:bg-sky-500/40 active:bg-sky-500 transition-colors z-30 hidden md:flex items-center justify-center shrink-0 -mx-[3px]"
                    >
                        <div className="w-[2px] h-8 rounded-full bg-white/20 group-hover:bg-sky-400 group-active:bg-sky-400 transition-colors" />
                    </div>
                )}

                <div className={`${mobilePane === "chat" ? "flex" : "hidden"} w-full md:flex md:w-auto`}>
                    <AnimatePresence initial={false}>
                        {showAiChat && (
                            <AiChat
                                projectId={id}
                                reloadTree={loadTree}
                                width={chatWidth}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div className='flex items-center justify-around border-t border-white/[0.06] bg-[#0f0f12] py-2 md:hidden'>
                <button
                    onClick={() => {
                        setMobilePane("explorer")
                        setShowExplorer(true)
                    }}
                    className={`flex flex-col items-center gap-1 px-4 py-1 text-[11px] font-medium transition-colors ${
                        mobilePane === "explorer" ? "text-white" : "text-zinc-500"
                    } cursor-pointer`}
                >
                    <Files size={18} />
                    Files
                </button>

                <button
                    onClick={() => {
                        setMobilePane("editor")
                    }}
                    className={`flex flex-col items-center gap-1 px-4 py-1 text-[11px] font-medium transition-colors ${
                        mobilePane === "editor" ? "text-white" : "text-zinc-500"
                    } cursor-pointer`}
                >
                    <Code2 size={18} />
                    Editor
                </button>

                <button
                    onClick={() => {
                        setMobilePane("chat")
                        setShowAiChat(true)
                    }}
                    className={`flex flex-col items-center gap-1 px-4 py-1 text-[11px] font-medium transition-colors ${
                        mobilePane === "chat" ? "text-white" : "text-zinc-500"
                    } cursor-pointer`}
                >
                    <Bot size={18} />
                    AI Chat
                </button>

                <button
                    onClick={() => {
                        setShowBottomPanel(v => !v)
                    }}
                    className={`flex flex-col items-center gap-1 px-4 py-1 text-[11px] font-medium transition-colors ${
                        showBottomPanel ? "text-white" : "text-zinc-500"
                    } cursor-pointer`}
                >
                    <TerminalSquare size={18} />
                    Terminal
                </button>
            </div>

            <AnimatePresence>
                {showPreview && isPreviewFullScreen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="fixed inset-0 z-[100] bg-white"
                    >
                        <Preview tree={tree} />
                        <motion.button
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            type="button"
                            onClick={() => setIsPreviewFullScreen(false)}
                            title="Exit fullscreen"
                            className="pointer-events-auto absolute right-4 top-4 flex items-center justify-center rounded-lg border border-white/10 bg-[#111113]/95 p-1.5 text-zinc-400 shadow-lg shadow-black/40 backdrop-blur hover:text-white sm:p-2 cursor-pointer z-50"
                        >
                            <Minimize2 size={13} />
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default ProjectPage
