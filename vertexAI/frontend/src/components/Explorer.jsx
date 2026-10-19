import React from 'react'
import { motion } from "motion/react"
import { RefreshCcw, FolderTree } from 'lucide-react'
import Folder from './Folder'

function Explorer({
    id,
    projectId = id,
    tree,
    reloadTree,
    openFile,
    width = 280
}) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -16, width: 0 }}
            animate={{ opacity: 1, x: 0, width: width }}
            exit={{ opacity: 0, x: -16, width: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ width: `${width}px` }}
            className="flex shrink-0 flex-col overflow-hidden border-r border-white/[0.06] bg-[#111113]/90 backdrop-blur-xl"
        >
            <div className='flex h-10 w-full shrink-0 items-center justify-between border-b border-white/[0.06] px-3'>
                <span className='text-[11px] font-semibold tracking-wider text-zinc-500'>
                    EXPLORER
                </span>

                <motion.button
                    whileHover={{ rotate: 60 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    onClick={reloadTree}
                    className="cursor-pointer rounded-md p-1 text-zinc-400 transition-colors hover:bg-white/[0.07] hover:text-white"
                    title="Refresh"
                >
                    <RefreshCcw size={14} />
                </motion.button>
            </div>

            <div className='
w-full flex-1 overflow-y-auto px-1 py-2
[&::-webkit-scrollbar]:w-1.5
[&::-webkit-scrollbar-track]:bg-transparent
[&::-webkit-scrollbar-thumb]:rounded-full
[&::-webkit-scrollbar-thumb]:bg-white/[0.08]
hover:[&::-webkit-scrollbar-thumb]:bg-white/[0.15]
[&::-webkit-scrollbar-thumb]:transition-colors
'
                style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}
            >
                {!Array.isArray(tree) || tree.length === 0 ? (
                    <div className='flex flex-col items-center gap-2 px-3 py-10 text-center'>
                        <FolderTree size={22} className="text-zinc-700" />
                        <span className="text-[12px] text-zinc-600">Empty WorkSpace</span>
                    </div>
                ) : (
                    tree.map((node) => (
                        <Folder
                            key={node?._id || node?.id}
                            node={node}
                            projectId={id || projectId}
                            tree={tree}
                            reloadTree={reloadTree}
                            openFile={openFile}
                        />
                    ))
                )}
            </div>
        </motion.div>
    )
}

export default Explorer
