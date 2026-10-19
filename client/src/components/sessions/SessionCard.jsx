import React from 'react'
import { CalendarIcon, UsersIcon, MessageSquareIcon, Trash2, Clock } from 'lucide-react'

const SessionCard = ({ session, onOpenDetails, onRejoin, onDelete }) => {
  const isEnded = session.status === "ended"

  // Calculate hours remaining before 12-hour auto-cleanup
  const createdAtTime = new Date(session.createdAt).getTime()
  const expiresAtTime = createdAtTime + (12 * 60 * 60 * 1000)
  const msRemaining = expiresAtTime - Date.now()
  const hoursRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60)))

  return (
    <div className="bg-white/70 backdrop-blur rounded-3xl p-6 transition-all flex flex-col justify-between space-y-5 border border-slate-100/60 shadow-xs hover:shadow-md transition-shadow">
      <div className="space-y-3">
        <div className='flex items-center justify-between'>
          <div className="flex items-center gap-2">
            <span className='text-xs font-mono text-slate-500 font-medium bg-slate-500/5 px-2.5 py-1 rounded-md'>
              ID: {session.meetingId}
            </span>

            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
              isEnded ? "bg-slate-500/10 text-slate-500" : "bg-emerald-500/10 text-emerald-600"
            }`}>
              <span className={`size-1.5 rounded-full ${isEnded ? "bg-slate-400" : "bg-emerald-500 animate-pulse"}`} />
              {isEnded ? "Ended" : "Active"}
            </span>
          </div>

          {onDelete && (
            <button
              onClick={() => onDelete(session.meetingId)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              title="Delete this session now"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <h3 className="text-xl font-medium text-slate-900 truncate">
          {session.title || "Instant Meeting"}
        </h3>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
          <p className="flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
            {new Date(session.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          <span
            className="flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/50"
            title="Auto-deletes from history 12 hours after creation"
          >
            <Clock className="w-3 h-3 text-amber-500" />
            {hoursRemaining}h left
          </span>
        </div>

        {/* Stats Row */}
        <div className='grid grid-cols-2 gap-3 pt-3 border-t border-slate-300/30'>
          <div className='flex items-center gap-2 text-xs bg-slate-500/5 p-2.5 rounded-xl'>
            <UsersIcon className="w-4 h-4 text-primary" />
            <span>
              <strong className='font-semibold text-slate-900'>{session.participants?.length || 0}</strong> Participants
            </span>
          </div>

          <div className='flex items-center gap-2 text-xs bg-slate-500/5 p-2.5 rounded-xl'>
            <MessageSquareIcon className="w-4 h-4 text-primary" />
            <span>
              <strong className='font-semibold text-slate-900'>{session.messages?.length || 0}</strong> Messages
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <button onClick={() => onOpenDetails(session.meetingId)}
            className='flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium py-2.5 px-3 rounded-full text-xs transition-all cursor-pointer text-center'>
            View Details
          </button>
          {!isEnded && (
            <button onClick={() => onRejoin(session.meetingId)}
              className='flex-1 bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-3 rounded-full text-xs transition-all shadow-xs cursor-pointer text-center'>
              Re-join
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(session.meetingId)}
              className='px-3.5 py-2.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200/80 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs shrink-0'
              title="Instant Delete Session"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default SessionCard
