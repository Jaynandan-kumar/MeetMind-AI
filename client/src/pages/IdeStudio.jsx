import React, { useState } from 'react';
import { Code2, ExternalLink, Maximize2, Minimize2, RotateCcw, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const IdeStudio = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const navigate = useNavigate();

  const handleRefresh = () => {
    setIframeKey(k => k + 1);
    toast.success("IDE reloaded");
  };

  return (
    <div className={`w-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-50' : 'h-screen'} bg-[#07070c]`}>
      {/* Top Utility Bar for the IDE */}
      <div className="w-full bg-[#0d0d12] text-white px-4 py-2 border-b border-white/[0.08] flex items-center justify-between text-xs shrink-0 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white font-medium transition-all cursor-pointer text-xs"
            title="Back to MeetMind Dashboard"
          >
            <span>←</span>
            <span>Dashboard</span>
          </button>

          <div className="h-3.5 w-px bg-white/15" />

          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Code2 size={13} className="text-indigo-400" /> VertexAI Studio
            </span>
          </div>
          <span className="hidden sm:inline text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 font-medium">
            Cloud IDE
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-all cursor-pointer shadow-xs"
            title="Start or join a video meeting with your code"
          >
            <Video size={13} />
            <span className="hidden sm:inline">Start Call</span>
          </button>

          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Reload IDE"
          >
            <RotateCcw size={13} />
          </button>

          <button
            onClick={() => setIsFullscreen(prev => !prev)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          <a
            href={import.meta.env.VITE_VERTEXAI_URL || "http://localhost:5173"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Open in separate tab"
          >
            <span className="hidden sm:inline text-[11px]">New Tab</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Embedded Live IDE */}
      <div className="flex-1 w-full bg-[#07070c] relative overflow-hidden">
        <iframe
          key={iframeKey}
          src={import.meta.env.VITE_VERTEXAI_URL || "http://localhost:5173"}
          title="VertexAI Cloud Studio"
          className="w-full h-full border-0"
          allow="clipboard-read; clipboard-write; camera; microphone"
        />
      </div>
    </div>
  );
};

export default IdeStudio;
