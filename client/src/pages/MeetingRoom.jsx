import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { dummyMeetingDetails, dummyUser } from '../assets/asset'
import VideoGrid from '../components/meeting/VideoGrid'
import useWebRTC from '../hooks/useWebRTC'
import ChatPanel from '../components/meeting/ChatPanel'
import { useChat } from '../hooks/useChat'
import ParticipantList from '../components/meeting/ParticipantList'
import ControlBar from '../components/meeting/ControlBar'
import toast from 'react-hot-toast'
import { useAuth, useUser } from '@clerk/react'
import { ExternalLink, X } from 'lucide-react'
import api from '../config/api'
import Loader from '../components/Loader'

const MeetingRoom = () => {
  const { meetingId } = useParams()
  const navigate = useNavigate()
  const { user } = useUser()
  const { getToken } = useAuth()

  const userdata = useMemo(()=>{
    if(!user) return null;
    return {
      id: user.id,
      name: user.fullName || user.firstName || user.primaryEmailAddress?.emailAddress?.split("@")[0] || "Jay Singh",
      email: user.primaryEmailAddress?.emailAddress || "",
      image: user.imageUrl || "",
    }
  }, [user?.id, user?.fullName, user?.firstName, user?.primaryEmailAddress?.emailAddress, user?.imageUrl])

  const [meeting, setMeeting] = useState(null)
  const [loadingMeeting, setLoadingMeeting] = useState(true);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false)
  const [isIDEOpen, setIsIDEOpen] = useState(false)

  // Fetch meeting details to verify validity BEFORE enabling WebRTC camera access
  useEffect(()=>{
    const fetchMeeting = async ()=>{
      try {
        const token = await getToken();
        const res = await api.get(`/api/meetings/${meetingId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.data.meeting.status === "ended"){
          toast.error("This meeting has ended");
          navigate("/dashboard");
          return;
        }
        setMeeting(res.data.meeting);
      } catch (error) {
        const errorMsg = error.response?.data?.error || "Meeting not found or has ended";
        toast.error(errorMsg);
        navigate("/dashboard");
      } finally {
        setLoadingMeeting(false);
      }
    }
    fetchMeeting();
  },[meetingId, getToken, navigate])

  const handleMeetingEnded = useCallback(()=>{
    navigate('/dashboard')
  },[navigate])

  // Initialize WebRTC
  const {
    localStream,
    remoteUsers,
    audioEnabled,
    videoEnabled,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    endMeeting
  } = useWebRTC(
    meetingId,
    userdata,
    handleMeetingEnded,
    !loadingMeeting && Boolean(meeting)
  )

  // Initialize Chat
  const {messages, sendMessage, unreadCount, isChatOpen, toggleChat, setIsChatOpen} = useChat(meetingId, userdata)

  const handleToggleChat = useCallback(() => {
    setIsParticipantsOpen(false)
    toggleChat()
  }, [toggleChat])

  const handleToggleParticipants = useCallback(() => {
    setIsParticipantsOpen((prev) => {
      const next = !prev
      if (next) {
        setIsChatOpen(false)
      }
      return next
    })
  }, [setIsChatOpen])

  const handleCloseChat = useCallback(() => {
    setIsChatOpen(false)
  }, [setIsChatOpen])

  const handleCloseParticipants = useCallback(() => {
    setIsParticipantsOpen(false)
  }, [])

  const handleToggleIDE = useCallback(() => {
    setIsIDEOpen((prev) => {
      const next = !prev
      if (next) {
        setIsChatOpen(false)
        setIsParticipantsOpen(false)
      }
      return next
    })
  }, [setIsChatOpen])

  const hostId = meeting?.host?.id || meeting?.host;
  const isHost = Boolean(userdata?.id && hostId && hostId.toString() === userdata.id.toString())

  const handleLeave = () => {
    toast("You left the meeting");
    navigate("/dashboard")
  }

  const handleEndMeeting = () => {
    endMeeting();
    toast("Meeting ended for all participants");
    navigate("/dashboard")
  }

  if (loadingMeeting) {
    return <Loader text="Joining meeting room..." />
  }

  return (
    <div className='h-screen w-screen bg-slate-900 text-slate-100 flex flex-col overflow-hidden relative font-sans select-none'>
      {/* Top Bar */}
      <header className="w-full bg-slate-900/90 backdrop-blur-md px-6 py-3 border-b border-slate-800 flex items-center justify-between z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-slate-100 tracking-tight">
            {meeting?.title || "Instant Meeting"} ({meetingId})
          </h2>
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"/>
        </div>
      </header>

      {/* Main Content Area (Video Grid + Side Panels) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video Grid Center */}
        <VideoGrid
          localStream={localStream}
          localUser={userdata}
          remoteUsers={remoteUsers}
          audioEnabled={audioEnabled}
          videoEnabled={videoEnabled}
          isScreenSharing={isScreenSharing}
        />

        {/* In-Meeting Chat Drawer */}
        <ChatPanel
          isOpen={isChatOpen}
          onClose={handleCloseChat}
          messages={messages}
          onSendMessage={sendMessage}
          currentUser={userdata}
        />

        {/* Participants Drawer */}
        <ParticipantList
          isOpen={isParticipantsOpen}
          onClose={handleCloseParticipants}
          localUser={userdata}
          localAudio={audioEnabled}
          localVideo={videoEnabled}
          remoteUsers={remoteUsers}
          meetingHostId={meeting?.host?.id || meeting?.host_id}
        />

        {/* In-Meeting Collaborative IDE Drawer / Split View */}
        {isIDEOpen && (
          <div className="w-full md:w-3/5 lg:w-2/3 h-full bg-[#0d0d12] border-l border-slate-800 flex flex-col z-30 shadow-2xl transition-all">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#14141d] border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-slate-200 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>VertexAI Collaborative Studio</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={import.meta.env.VITE_VERTEXAI_URL || "http://localhost:5173"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 transition-all cursor-pointer"
                  title="Open in full browser window"
                >
                  <span>Full Window</span>
                  <ExternalLink size={12} />
                </a>
                <button
                  onClick={() => setIsIDEOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close IDE Panel"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
            <iframe
              src={import.meta.env.VITE_VERTEXAI_URL || "http://localhost:5173"}
              title="VertexAI Studio"
              className="w-full flex-1 border-0 bg-[#07070c]"
              allow="clipboard-read; clipboard-write; camera; microphone"
            />
          </div>
        )}
      </div>

      {/* Bottom Floating Control Bar */}
      <ControlBar
        roomId={meetingId}
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        isScreenSharing={isScreenSharing}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
        onToggleChat={handleToggleChat}
        onToggleParticipants={handleToggleParticipants}
        isChatOpen={isChatOpen}
        isParticipantsOpen={isParticipantsOpen}
        isIDEOpen={isIDEOpen}
        onToggleIDE={handleToggleIDE}
        unreadCount={unreadCount}
        participantCount={1 + remoteUsers.length}
        isHost={isHost}
        onLeave={handleLeave}
        onEndMeeting={handleEndMeeting}
      />
    </div>
  )
}

export default MeetingRoom
