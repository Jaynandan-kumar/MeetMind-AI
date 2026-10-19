import React from 'react'
import { useState } from 'react';
import { useEffect } from 'react';
import { FiMoon } from "react-icons/fi";
import { IoSunnyOutline } from "react-icons/io5";
import { useDispatch, useSelector } from 'react-redux';
import { ChevronDown, LogOut, Menu, Video, X } from "lucide-react";
import { logout } from '../features/logout';
import { setUserData } from '../redux/userSlice';
import { setProjects, setStarredProjects, setCurrentProject } from '../redux/projectSlice';

function NavBar({ onToggleSidebar, mobileSideBarOpen, setMobileSidebarOpen }) {
    const [isDark, setIsDark] = useState(true)
    const [menuOpen, setMenuOpen] = useState(false)
    const dispatch = useDispatch()
    const { userData } = useSelector(state => state.user)
    const name = userData?.name || "Guest"
    const initials = name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()

    const handleLogout = async () => {
        await logout()
        dispatch(setUserData(null))
        dispatch(setProjects([]))
        dispatch(setStarredProjects([]))
        dispatch(setCurrentProject(null))
        setMenuOpen(false)
    }

    useEffect(() => {
        if (typeof window == undefined) return;
        const theme = window.localStorage.getItem("theme")
        const dark = theme ? theme == "dark" : true
        document.documentElement.classList.toggle("dark", dark)
        setIsDark(dark)
    }, [])

    const toggleTheme = () => {
        const next = !isDark
        setIsDark(next)
        document.documentElement.classList.toggle("dark", next)
        window.localStorage.setItem("theme", next ? "dark" : "light")
    }

    return (
        <div className='w-full h-16 bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl border-b border-slate-200/70 dark:border-white/[0.07] flex items-center justify-between px-4 sm:px-6 font-sans transition-colors duration-300'>
            <div className='flex items-center gap-2.5 shrink-0'>
                {(onToggleSidebar || setMobileSidebarOpen) && (
                    <button
                        onClick={() => {
                            if (onToggleSidebar) onToggleSidebar()
                            else if (setMobileSidebarOpen) setMobileSidebarOpen(p => !p)
                        }}
                        className='md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer'
                        title="Toggle navigation"
                    >
                        {mobileSideBarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                )}
                <span className='text-slate-900 dark:text-white font-bold text-[17px] tracking-tight'>
                    VertexAI
                </span>
            </div>
            <div className='flex items-center gap-2 shrink-0'>
                <a
                    href={`${import.meta.env.VITE_MEETMIND_URL || "http://localhost:5174"}/dashboard`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className='hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:text-slate-200 text-xs font-medium transition-all cursor-pointer shadow-xs'
                    title="Open MeetMind AI Video Calling"
                >
                    <Video size={14} className="text-indigo-500 dark:text-indigo-400" />
                    <span>MeetMind</span>
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:bg-indigo-400/20 dark:text-indigo-300 px-1.5 py-0.5 rounded-full font-semibold">
                        Call
                    </span>
                </a>

                <button
                    onClick={toggleTheme}
                    className='flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors duration-150 cursor-pointer'
                >
                    {isDark ? <FiMoon size={18} /> : <IoSunnyOutline size={18} />}
                </button>

                <div className='relative ml-1'>
                    <button
                        onClick={() => setMenuOpen(p => !p)}
                        className='flex items-center gap-2 pl-1.5 pr-2 h-10 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors duration-150 cursor-pointer'
                    >
                        <div className='w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 dark:from-slate-200 dark:to-white flex items-center justify-center overflow-hidden ring-1 ring-black/5 dark:ring-white/20'>
                            <span className='text-[12px] font-semibold text-white dark:text-slate-900'>
                                {initials}
                            </span>
                        </div>
                        <span className='text-[13.5px] font-medium text-slate-700 dark:text-slate-200 hidden sm:inline'>{name}</span>
                        <ChevronDown size={14} className={`text-slate-400 dark:text-slate-500 transition-transform duration-150 ${menuOpen ? "rotate-180" : ""}`} />
                    </button>

                    {menuOpen && (
                        <div className='absolute right-0 mt-2 w-52 bg-white/95 dark:bg-[#12121c]/95 backdrop-blur-xl border border-slate-200 dark:border-white/[0.08] rounded-xl shadow-xl py-1.5 z-50 animate-[fadeIn_0.15s_ease-out]'>
                            <div className='px-3.5 py-2.5 border-b border-slate-100 dark:border-white/[0.06] flex items-center gap-2.5'>
                                <div className='w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 dark:from-slate-200 dark:to-white flex items-center justify-center shrink-0 ring-1 ring-black/5 dark:ring-white/20'>
                                    <span className='text-[12px] font-semibold text-white dark:text-slate-900'>
                                        {initials}
                                    </span>
                                </div>
                                <div className='min-w-0'>
                                    <p className='text-[13px] font-medium text-slate-800 dark:text-slate-200 truncate'>{name}</p>
                                    <p className='text-[11px] text-slate-400 dark:text-slate-500 truncate'>{userData?.email}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className='w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors duration-150 cursor-pointer'
                            >
                                <LogOut size={15}/>
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default NavBar
