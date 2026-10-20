import React, { useEffect, useRef, useState } from 'react'
import { Terminal as XTerminal } from "@xterm/xterm"
import { FitAddon } from '@xterm/addon-fit'
import "@xterm/xterm/css/xterm.css"
import { io } from "socket.io-client"
import { Eraser } from "lucide-react"

function Terminal({ projectId, userId }) {
    const containerRef = useRef(null)
    const terminalRef = useRef(null)
    const [connected, setConnected] = useState(false)
    const [mode, setMode] = useState(() => {
        try {
            return localStorage.getItem("vertex_terminal_mode") || "cloud"
        } catch {
            return "cloud"
        }
    })

    const handleSwitchMode = (newMode) => {
        setMode(newMode)
        try {
            localStorage.setItem("vertex_terminal_mode", newMode)
        } catch {}
    }

    useEffect(() => {
        if (!projectId || !userId) return;

        const terminal = new XTerminal({
            cursorBlink: true,
            cursorStyle: "block",
            fontSize: 13,
            fontFamily: "Menlo, Monaco, Consolas, monospace",
            scrollback: 5000,
            theme: {
                background: "#0d0d0f",
                foreground: "#d4d4d4",
                cursor: "#ffffff",
                selectionBackground: "#264f78",
            },
        })

        const fitAddon = new FitAddon()
        terminal.loadAddon(fitAddon)
        terminal.open(containerRef.current)
        terminalRef.current = terminal

        const fitTerminal = () => {
            try {
                fitAddon.fit()
            } catch (error) {
                console.log(error)
            }
        }
        fitTerminal()

        const cloudUrl = import.meta.env.VITE_TERMINAL_SERVICE_URL || "https://vertexai-backend-jdqb.onrender.com"
        const terminal_url = mode === "local" ? "http://localhost:8005" : cloudUrl

        if (!terminal_url) {
            terminal.write("\r\n\x1b[31mVITE_TERMINAL_SERVICE_URL missing\x1b[0m\r\n")
            return () => terminal.dispose()
        }

        const socket = io(terminal_url, {
            transports: ["websocket"],
            withCredentials: true
        })

        let hasShownError = false

        socket.on("connect", () => {
            setConnected(true)
            hasShownError = false
            fitTerminal()
            socket.emit("terminal:init", {
                projectId,
                userId,
                rows: terminal.rows,
                cols: terminal.cols
            })
        })

        socket.on("terminal:data", (data) => {
            terminal.write(String(data || ""))
        })

        socket.on("terminal:ready", () => {
            fitTerminal()
            socket.emit("terminal:resize", { rows: terminal.rows, cols: terminal.cols })
            terminal.focus()
        })

        const input = terminal.onData((data) => {
            if (!socket.connected) return;
            socket.emit("terminal:write", data)
        })

        const resizeTerminal = () => {
            fitTerminal()
            if (!socket.connected) return;
            socket.emit("terminal:resize", { cols: terminal.cols, rows: terminal.rows })
        }

        window?.addEventListener("resize", resizeTerminal)

        const resizeObserver = new ResizeObserver(resizeTerminal)
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current)
        }

        const focusTerminal = () => {
            terminal.focus()
        }

        const containerEl = containerRef.current
        containerEl?.addEventListener("click", focusTerminal)

        socket.on("connect_error", () => {
            setConnected(false)
            if (!hasShownError) {
                if (mode === "local") {
                    terminal.write("\r\n\x1b[33m[My PC Terminal: Start local service on port 8005 (or switch to ☁️ Cloud)]\x1b[0m\r\n")
                } else {
                    terminal.write("\r\n\x1b[33m[Connecting to cloud terminal...]\x1b[0m\r\n")
                }
                hasShownError = true
            }
        })

        socket.on("disconnect", () => {
            setConnected(false)
        })

        return () => {
            window?.removeEventListener("resize", resizeTerminal)
            resizeObserver.disconnect()
            containerEl?.removeEventListener("click", focusTerminal)
            input?.dispose()
            socket.disconnect()
            terminal.dispose()
        }
    }, [projectId, userId, mode])

    const clearTerminal = () => {
        const terminal = terminalRef.current
        if (!terminal) return;
        terminal.clear()
        terminal.write("\x1b[2J\x1b[H")
        terminal.focus()
    }

    return (
        <div className='flex h-full flex-col bg-[#0d0d0f]'>
            <div className='flex h-7 shrink-0 items-center justify-between border-b border-white/[0.05] px-3'>
                <div className='flex items-center gap-2.5'>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                        connected
                            ? "bg-emerald-400"
                            : "bg-amber-400 animate-pulse"
                    }`}
                    />
                    <span className="text-[11px] text-zinc-400">
                        {connected
                            ? `terminal (${mode === "local" ? "My PC" : "Cloud"}) - connected`
                            : `terminal (${mode === "local" ? "My PC" : "Cloud"}) - connecting...`}
                    </span>
                    <div className='flex items-center gap-0.5 rounded bg-white/[0.05] p-0.5 text-[10px] ml-1'>
                        <button
                            type="button"
                            onClick={() => handleSwitchMode("cloud")}
                            className={`rounded px-1.5 py-0.5 transition-colors cursor-pointer ${
                                mode === "cloud" ? "bg-sky-500/20 text-sky-300 font-semibold" : "text-zinc-500 hover:text-zinc-300"
                            }`}
                            title="Cloud container terminal"
                        >
                            ☁️ Cloud
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSwitchMode("local")}
                            className={`rounded px-1.5 py-0.5 transition-colors cursor-pointer ${
                                mode === "local" ? "bg-emerald-500/20 text-emerald-300 font-semibold" : "text-zinc-500 hover:text-zinc-300"
                            }`}
                            title="Connect to local PC terminal (port 8005)"
                        >
                            💻 My PC
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={clearTerminal}
                        title="Clear terminal"
                        className="rounded p-1 text-zinc-500 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                    >
                        <Eraser size={12} />
                    </button>
                </div>
            </div>
            <div ref={containerRef} className='min-h-0 flex-1 cursor-text overflow-hidden' />
        </div>
    )
}

export default Terminal
