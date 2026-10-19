import React from 'react'
import { useSelector } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from "motion/react"
import { Eye, Code2, ArrowLeft, Video } from 'lucide-react'

function TopBar({ showPreview, setShowPreview }) {
    const { currentProject } = useSelector(state => state.project)
    const navigate = useNavigate()

    return (
        <div className='relative flex h-12 items-center justify-between border-b border-white/[0.06] bg-[#111113]/90 px-4 backdrop-blur-xl'>
            <div className='flex items-center gap-2.5'>
                <button
                    type="button"
                    onClick={() => navigate('/')}
                    title="Back to Dashboard"
                    className="flex items-center justify-center rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                >
                    <ArrowLeft size={16} />
                </button>

                <Link to="/" className='text-white text-lg font-bold transition-opacity hover:opacity-85 cursor-pointer'>
                    VertexAI
                </Link>

                <div className='h-4 w-px bg-white/10' />

                <div className='flex items-center gap-2'>
                    <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[13px]'>
                        📁
                    </div>
                    <div className='max-w-[220px] truncate text-sm font-medium text-zinc-300'>
                        {currentProject?.name || "project"}
                    </div>
                </div>
            </div>

            <div className='flex items-center gap-2'>
                {/* MeetMind Live Call Collab */}
                <a
                    href={`${import.meta.env.VITE_MEETMIND_URL || "http://localhost:5174"}/dashboard`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Start or join a video call with MeetMind AI"
                    className="flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 to-sky-500/10 px-2.5 py-1 text-[12px] font-medium text-indigo-300 hover:border-indigo-500/50 hover:from-indigo-500/20 hover:to-sky-500/20 transition-all cursor-pointer shadow-xs group"
                >
                    <Video size={13} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                    <span className="hidden sm:inline">MeetMind Call</span>
                </a>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowPreview?.((v) => !v)}
                    title={showPreview ? "Show Editor" : "Show Preview"}
                    className={`relative flex items-center justify-center rounded-lg p-2 transition-colors cursor-pointer ${
                        showPreview ? "text-sky-400" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                >
                    <motion.div
                        className="absolute inset-0 rounded-lg bg-white/[0.06]"
                        transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
                    />
                    {showPreview ? (
                        <Eye size={16} className='relative' />
                    ) : (
                        <Code2 size={16} className='relative' />
                    )}
                </motion.button>
            </div>
        </div>
    )
}

export default TopBar
