import React, { useEffect, useState } from 'react'
import { ArrowRightIcon, Code2, ExternalLink, KeyboardIcon, Lock, PlusIcon, ShieldCheckIcon } from "lucide-react"
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useUser, useAuth } from '@clerk/react'
import api from '../config/api.js';

const Dashboard = () => {
  const { user } = useUser();
  const userName = user?.fullName || "Jay Singh";
  const userEmail = user?.primaryEmailAddress?.emailAddress;

  const { isLoaded, isSignedIn, getToken } = useAuth();
  const navigate = useNavigate()
  const [isCreating, setIsCreating] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [stats, setStats] = useState(null)
  const [joinId, setJoinId] = useState("")

  const isLimitReached = Boolean(stats?.monthlyLimit && stats?.monthlyCount >= stats?.monthlyLimit);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const fetchStats = async () => {
      if (!isLoaded || !isSignedIn) return;

      try {
        const token = await getToken();
        const { data } = await api.get("/api/meetings/stats", {
          headers: { Authorization: `Bearer ${token}` },
        })
        setStats(data)
      } catch (error) {
        toast.error(error.response?.data?.error || error.message)
      }
    };
    fetchStats();
  }, [isLoaded, isSignedIn, getToken])

  const handleCreateMeeting = async () => {
    if (!isLoaded || !isSignedIn) return;

    if (isLimitReached) {
      toast.error("Free plan limit reached (30/30 meetings). Upgrade to unlock unlimited meetings! 🔒");
      navigate("/pricing");
      return;
    }

    setIsCreating(true)

    try {
      const token = await getToken();
      const res = await api.post("/api/meetings", { title: `${userName}'s Meeting` }, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const meetingId = res.data.meeting.meetingId;
      toast.success("Meeting created!");
      navigate(`/meeting/${meetingId}`);
    } catch (error) {
      if (error.response?.data?.limitReached) {
        toast.error(error.response?.data?.error || "Free plan limit reached. Upgrade to unlock! 🔒");
        navigate("/pricing");
      } else {
        toast.error(error.response?.data?.error || error.message);
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinMeeting = async (e) => {
    e.preventDefault();
    const cleanId = joinId.trim();
    if (!/^[a-z]{3}(?:-[a-z]{3}){2}$/.test(cleanId)) {
      toast.error("Please enter a valid Meeting ID");
      return;
    }

    try {
      const token = await getToken();
      await api.get(`/api/meetings/${cleanId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      navigate(`/meeting/${cleanId}`);
    } catch (error) {
      toast.error("Meeting not found. Check the ID and try again.");
    }
  }

  return (
    <div className='flex-1 max-w-7xl w-full mx-auto p-6 md:p-12 flex flex-col justify-center'>
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-12 items-center'>
        {/* Left Column - Actions */}
        <div className='lg:col-span-7 space-y-8'>

          <div className='space-y-3'>
            <div className='inline-flex items-center gap-2 px-3.5 pr-6 py-2 rounded-full bg-white/25 text-xs font-medium'>
              <ShieldCheckIcon size={16}/>
              Secure Peer-to-Peer Encryption
            </div>
            <h1 className='text-4xl sm:text-5xl text-slate-800 leading-tight font-medium'>
              High quality video calls. <br />
              <span className='text-primary'>Built for everyone.</span>
            </h1>
            <p className='text-slate-700 text-base sm:text-lg max-w-xl leading-relaxed'>
              Connect, collaborate, and celebrate from anywhere with ultra-low latency video, screen sharing, and real-time chat.
            </p>
          </div>

          <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2'>
            {isLimitReached ? (
              <button 
                onClick={() => {
                  toast.error("Free plan limit reached (30/30 meetings). Upgrade to unlock unlimited meetings! 🔒");
                  navigate("/pricing");
                }}
                className='bg-amber-600 hover:bg-amber-700 text-white font-medium px-6 py-3.5 rounded-full shadow-md shadow-amber-600/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer'
                title="Monthly limit reached. Upgrade to unlock meetings."
              >
                <Lock className="w-5 h-5"/>
                <span>Upgrade to Unlock</span>
              </button>
            ) : (
              <button 
                onClick={handleCreateMeeting}
                disabled={isCreating}
                className='bg-primary hover:bg-primary-hover text-white font-medium px-6 py-3.5 rounded-full shadow-md shadow-primary/20 flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50'
              >
                <PlusIcon className="w-5 h-5"/>
                <span>{isCreating ? "Creating..." : "New Meeting"}</span>
              </button>
            )}

            <form onSubmit={handleJoinMeeting} className='flex-1 flex items-center gap-2'>
              <div className='relative flex-1'>
                <KeyboardIcon className="w-5 h-5 text-primary/90 absolute left-4 top-1/2 -translate-y-1/2"/>

                <input 
                  type="text" 
                  placeholder="Enter meeting code (e.g. abc-def-ghi)"
                  value={joinId} 
                  onChange={(e) => setJoinId(e.target.value)}
                  className='w-full bg-white/75 border border-primary-border/80 focus:border-primary/60 focus:ring-1 focus:ring-primary/60 rounded-full pl-12 pr-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all'
                />
              </div>

              <button 
                type='submit'
                disabled={!joinId.trim()}
                className='bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 text-white font-medium px-6 py-3.5 rounded-full transition-all flex items-center justify-center cursor-pointer shadow-xs'
              >
                <span>Join</span>
                <ArrowRightIcon className="w-4 h-4 ml-1.5" />
              </button>
            </form>
          </div>

          {/* Collab Banner with VertexAI */}
          <div className='p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-indigo-50/90 via-sky-50/70 to-white border border-indigo-100/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
            <div className='flex items-center gap-3.5'>
              <div className='w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20'>
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <div className='flex items-center gap-2'>
                  <h3 className='text-sm font-semibold text-slate-900'>VertexAI Cloud Studio</h3>
                  <span className='px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 tracking-wide uppercase border border-indigo-200/60'>
                    Integrated
                  </span>
                </div>
                <p className='text-xs text-slate-600 leading-relaxed mt-0.5'>
                  AI Code Editor, Live Previews & Terminal connected to your team.
                </p>
              </div>
            </div>

            <Link
              to="/ide"
              className='shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer'
            >
              <span>Launch IDE</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>

        {/* Right Column - Hero Graphic & Clock Card */}
        <div className='lg:col-span-5 flex flex-col items-center justify-center space-y-4'>
          <div className='w-full bg-white/25 backdrop-blur rounded-4xl p-8 border border-slate-200 text-center space-y-6 relative overflow-hidden'>
            <div className='space-y-1'>
              <p className='mb-5 text-xl text-left'>
                Hi, <span className='font-medium'>{userName}</span>
              </p>

              <h2 className='text-4xl xl:text-7xl my-4 text-slate-900 tracking-wide'>
                {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </h2>

              <p className='font-medium tracking-wider text-primary'>
                {currentTime.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                })}
              </p>
            </div>

            <div className='pt-4 border-t border-white/30 text-sm text-slate-600'>
              <div className='flex items-center justify-between py-6 px-4'>
                <p>Logged in as: <span className="text-slate-900">{userEmail}</span></p>

                <span className={`px-4 py-1 rounded-full font-semibold text-xs uppercase ${
                  stats?.plan === "premium" ? "bg-blue-700 text-white" : "bg-white/70 text-slate-800"
                }`}>
                  {stats?.plan || "Free"}
                </span>
              </div>

              {stats && (
                <div className={`w-full rounded-2xl px-5 py-4 border transition-all text-left ${
                  isLimitReached 
                    ? "bg-rose-50/90 border-rose-200 text-rose-950 shadow-xs" 
                    : "bg-white/50 border-slate-100"
                }`}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800">Monthly Meetings</span>
                    <span className={`text-xs font-mono font-semibold ${
                      isLimitReached ? "text-rose-600" : "text-slate-600"
                    }`}>
                      {stats.monthlyLimit
                        ? `${stats.monthlyCount} / ${stats.monthlyLimit} Used`
                        : `${stats.monthlyCount} Created (Unlimited)`
                      }
                    </span>
                  </div>

                  {stats.monthlyLimit && (
                    <div className="w-full bg-slate-200/70 rounded-full h-2 mt-2.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isLimitReached ? "bg-rose-600" : "bg-primary"
                        }`}
                        style={{
                          width: `${Math.min(100, Math.round((stats.monthlyCount / stats.monthlyLimit) * 100))}%`
                        }}
                      />
                    </div>
                  )}

                  {isLimitReached && (
                    <div className="mt-3 pt-2.5 border-t border-rose-200 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 text-rose-600 font-semibold">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Limit Reached (30/30)</span>
                      </span>
                      <Link 
                        to="/pricing" 
                        className="inline-flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-lg font-medium shadow-xs transition-all cursor-pointer"
                      >
                        <span>Upgrade</span>
                        <ArrowRightIcon className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}

export default Dashboard