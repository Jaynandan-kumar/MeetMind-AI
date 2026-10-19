import React, { useState } from 'react'
import { motion, AnimatePresence } from "motion/react"
import { Star, Trash2, X } from "lucide-react"
import { deleteProject, toggleStar } from '../features/project'
import { useDispatch } from 'react-redux'
import { starProject, setDeleteProject, setCurrentProject } from '../redux/projectSlice'
import { useNavigate } from 'react-router-dom'

function ProjectCard({ project }) {
    const [loadingStar, setLoadingStar] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [loadingDelete, setLoadingDelete] = useState(false)
    const [showDescModal, setShowDescModal] = useState(false)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const handleToggleStar = async (e) => {
        e && e.stopPropagation && e.stopPropagation()
        setLoadingStar(true)
        await toggleStar(project?._id)
        dispatch(starProject(project?._id))
        setLoadingStar(false)
    }

    const handleDelete = async (e) => {
        e && e.stopPropagation && e.stopPropagation()
        setLoadingDelete(true)
        await deleteProject(project?._id)
        dispatch(setDeleteProject(project?._id))
        setLoadingDelete(false)
    }

    return (
        <motion.div
            initial={{
                opacity: 0,
                y: 8,
            }}
            animate={{
                opacity: 1,
                y: 0,
            }}
            exit={{
                opacity: 0,
                scale: 0.97,
            }}
            whileHover={{
                y: -3,
            }}
            transition={{
                duration: 0.18,
                ease: "easeOut",
            }}
            onClick={() => {
                dispatch(setCurrentProject(project))
                navigate(`/project/${project?._id}`)
            }}
            className="group relative cursor-pointer rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] dark:border-white/[0.07] dark:bg-white/[0.03] dark:shadow-none dark:hover:border-white/[0.14] dark:hover:bg-white/[0.045] hover:z-30"
        >
            <motion.div
                whileTap={{
                    scale: 0.9,
                }}
                disabled={loadingStar}
                onClick={handleToggleStar}
                className={`absolute right-4 top-4 rounded-md p-1 transition-opacity hover:text-amber-400 cursor-pointer ${project?.starred ? "opacity-100 text-amber-400" : "opacity-100 sm:opacity-0 text-zinc-300 group-hover:opacity-100 dark:text-zinc-600"} ${loadingStar ? "cursor-wait opacity-60" : ""}`}
            >
                <Star
                    size={15}
                    className={
                        project?.starred
                            ? "fill-amber-400 text-amber-400"
                            : ""
                    }
                />
            </motion.div>

            <h3 className="mb-1.5 truncate pr-6 text-[14px] font-semibold tracking-tight text-zinc-900 dark:text-white">
                {project?.name}
            </h3>

            <div
                className="relative"
                onMouseEnter={() => setShowDescModal(true)}
                onMouseLeave={() => setShowDescModal(false)}
            >
                <div
                    className="custom-scrollbar h-[44px] overflow-y-auto pr-1 text-[12.5px] leading-snug text-zinc-500 select-text"
                    onClick={(e) => {
                        if (project?.description && project.description.length > 50) {
                            e.stopPropagation()
                            setShowDescModal(prev => !prev)
                        }
                    }}
                >
                    <p className="whitespace-pre-wrap break-words">
                        {project?.description || "No Description"}
                    </p>
                </div>

                {/* Styled Floating Description Popover */}
                <AnimatePresence>
                    {showDescModal && project?.description && project.description.length > 50 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: -4 }}
                            transition={{ duration: 0.15 }}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute -top-3 left-0 right-0 z-50 w-full min-w-[280px] max-w-[340px] rounded-2xl border border-zinc-200/90 bg-white/98 p-4 shadow-2xl shadow-black/15 backdrop-blur-xl dark:border-white/[0.14] dark:bg-[#141419]/98 dark:shadow-black/85"
                        >
                            <div className="mb-2.5 flex items-center justify-between border-b border-zinc-200/60 pb-2 dark:border-white/[0.08]">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="truncate text-[12.5px] font-semibold text-zinc-900 dark:text-zinc-100">
                                        {project?.name}
                                    </span>
                                    <span className="shrink-0 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-600 dark:text-sky-400">
                                        Description
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setShowDescModal(false)
                                    }}
                                    className="shrink-0 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-white/[0.06] dark:hover:text-zinc-300 cursor-pointer"
                                >
                                    <X size={13} />
                                </button>
                            </div>

                            <div className="custom-scrollbar max-h-56 overflow-y-auto pr-1.5 text-[12.5px] leading-relaxed text-zinc-600 dark:text-zinc-300 select-text">
                                <p className="whitespace-pre-wrap break-words">
                                    {project?.description}
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="mt-4 flex items-center justify-end border-t border-black/[0.05] pt-3 dark:border-white/[0.06]" onClick={(e) => e.stopPropagation()}>
                {confirmDelete ? (
                    <motion.div
                        initial={{
                            opacity: 0,
                        }}
                        animate={{
                            opacity: 1,
                        }}
                        exit={{
                            opacity: 0,
                        }}
                        className="flex items-center gap-2"
                    >
                        <button
                            onClick={(e) => {
                                e && e.stopPropagation && e.stopPropagation()
                                setConfirmDelete(false)
                            }}
                            className="rounded-md px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            disabled={loadingDelete}
                            onClick={handleDelete}
                            className="rounded-md bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-500 hover:bg-red-500/20 dark:text-red-400 disabled:cursor-wait disabled:opacity-50 cursor-pointer"
                        >
                            Yes
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{
                            opacity: 0,
                        }}
                        animate={{
                            opacity: 1,
                        }}
                        whileTap={{
                            scale: 0.92,
                        }}
                        onClick={(e) => {
                            e && e.stopPropagation && e.stopPropagation()
                            setConfirmDelete(true)
                        }}
                        className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-zinc-300 opacity-100 sm:opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 dark:text-zinc-600 dark:hover:text-red-400 cursor-pointer"
                    >
                        <Trash2 size={13} />
                    </motion.div>
                )}
            </div>
        </motion.div>
    )
}

export default ProjectCard
