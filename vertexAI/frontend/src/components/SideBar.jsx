import React from 'react'
import { motion } from "motion/react"
import { Coins, Folder, Star, Zap } from "lucide-react"
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

const getCreditTheme = (credits = 0) => {
  if (credits < 500) {
    return {
      text: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      border: "hover:border-amber-500/30",
    }
  } else if (credits < 1000) {
    return {
      text: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      border: "hover:border-emerald-500/30",
    }
  } else if (credits < 2000) {
    return {
      text: "text-sky-600 dark:text-sky-400",
      iconBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
      border: "hover:border-sky-500/30",
    }
  } else if (credits <= 5000) {
    return {
      text: "text-purple-600 dark:text-purple-400",
      iconBg: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
      border: "hover:border-purple-500/30",
    }
  } else {
    return {
      text: "text-pink-600 dark:text-pink-400",
      iconBg: "bg-pink-500/15 text-pink-600 dark:text-pink-400",
      border: "hover:border-pink-500/30",
    }
  }
}

function SideBar({ activeSession, setActiveSession }) {
  const navigate = useNavigate()
  const { userData } = useSelector((state) => state.user)
  const credits = userData?.credits ?? 0
  const creditTheme = getCreditTheme(credits)

  return (
    <div className='flex h-full w-full md:w-64 shrink-0 flex-col md:border-r border-slate-200/70 bg-white/60 px-3 py-5 font-sans backdrop-blur-xl transition-colors duration-300 dark:border-white/[0.06] dark:bg-white/[0.02]'>
      <div className='flex flex-col gap-1'>
        <motion.div
          whileTap={{ scale: 0.97 }}
          onClick={() => setActiveSession && setActiveSession("projects")}
          className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors duration-150 cursor-pointer ${activeSession == "projects" ? "text-slate-900 dark:text-white" : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-200"}`}
        >
          {activeSession == "projects" && (
            <div className='absolute inset-0 rounded-lg border border-slate-900/10 bg-slate-900/5 dark:border-white/10 dark:bg-white/10' />
          )}
          <Folder
            size={17}
            strokeWidth={2}
            className="relative"
          />
          <span className='relative'>
            Projects
          </span>
        </motion.div>

        <motion.div
          whileTap={{ scale: 0.97 }}
          onClick={() => setActiveSession && setActiveSession("starred")}
          className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors duration-150 cursor-pointer ${activeSession == "starred" ? "text-slate-900 dark:text-white" : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-200"}`}
        >
          {activeSession == "starred" && (
            <div className='absolute inset-0 rounded-lg border border-slate-900/10 bg-slate-900/5 dark:border-white/10 dark:bg-white/10' />
          )}
          <Star
            size={17}
            strokeWidth={2}
            className="relative"
          />
          <span className='relative'>
            Starred
          </span>
        </motion.div>
      </div>

      <div className='my-4 h-px bg-slate-200/70 dark:bg-white/[0.06]'/>

      <div className={`mb-3 rounded-xl border border-slate-200/70 bg-white/70 p-3.5 shadow-sm backdrop-blur-xl dark:border-white/[0.07] dark:bg-white/[0.03] dark:shadow-none transition-colors duration-200 ${creditTheme.border}`}>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-200 ${creditTheme.iconBg}`}>
              <Coins size={16} />
            </div>
            <span className='text-[12.5px] font-medium text-slate-700 dark:text-slate-300'>AI Credits</span>
          </div>
          <span className={`text-[13px] font-semibold tracking-wide transition-colors duration-200 ${creditTheme.text}`}>
            {credits}
          </span>
        </div>
      </div>

      <div className='rounded-xl border border-slate-200/70 bg-white/70 p-3.5 shadow-sm backdrop-blur-xl dark:border-white/[0.07] dark:bg-white/[0.03] dark:shadow-none'>
        <p className='mb-1 text-[12.5px] font-medium text-slate-700 dark:text-slate-300'>Upgrade Plan</p>
        <p className='mb-3 text-[11.5px] leading-snug text-slate-400 dark:text-slate-500'>Upgrade to Pro for more credits</p>
        <motion.button
          onClick={() => navigate("/plan")}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-2 text-[12.5px] font-semibold text-white shadow-sm transition-opacity duration-150 hover:opacity-90 dark:bg-white dark:text-slate-900 cursor-pointer"
        >
          <Zap size={13} fill="currentColor" />
          Upgrade Now
        </motion.button>
      </div>
    </div>
  )
}

export default SideBar
