import React, { useMemo, useState, useEffect } from 'react'
import { RotateCw, ExternalLink, Globe, Code } from 'lucide-react'

function Preview({ tree }) {
    // Detect whether project has React / Vite / package.json dependencies
    const isReactOrServerProject = useMemo(() => {
        let hasServerOrFramework = false
        const check = (items = []) => {
            for (const item of items) {
                const name = (item.name || "").toLowerCase()
                if (
                    name === "package.json" ||
                    name === "vite.config.js" ||
                    name === "vite.config.ts" ||
                    name.endsWith(".jsx") ||
                    name.endsWith(".tsx")
                ) {
                    hasServerOrFramework = true
                    return
                }
                if (item.children?.length) check(item.children)
            }
        }
        check(tree)
        return hasServerOrFramework
    }, [tree])

    // State for preview mode ("auto" follows project type, or explicitly "server" / "static")
    const [userModeOverride, setUserModeOverride] = useState(null)
    const [serverUrl, setServerUrl] = useState("http://localhost:5175")
    const [iframeKey, setIframeKey] = useState(0)

    // Reset override when tree/project changes
    useEffect(() => {
        setUserModeOverride(null)
    }, [tree])

    const effectiveMode = userModeOverride || (isReactOrServerProject ? "server" : "static")

    const handleReload = () => {
        setIframeKey(k => k + 1)
    }

    const srcDoc = useMemo(() => {
        let html = ""
        let css = ""
        let js = ""

        const walk = (items = []) => {
            for (const item of items) {
                if (item.type == "file") {
                    if (item.name == "index.html") html = item.content || ""
                    if (item.name.endsWith("css")) css = item.content || ""
                    if (item.name.endsWith("js") && !item.name.endsWith(".jsx")) js = item.content || ""
                }
                if (item.children?.length) walk(item.children)
            }
        }

        walk(tree)

        if (!html) {
            return `
                <!DOCTYPE html>
                <html>
                    <body style="
                        margin:0;
                        background:#0a0a0c;
                        color:#999;
                        font-family:Arial,sans-serif;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        height:100vh;
                    ">
                        <div style="text-align:center;">
                            <h3 style="margin:0 0 6px;">No index.html found</h3>
                            <p style="margin:0;font-size:13px;color:#666;">Create an HTML project to see preview</p>
                        </div>
                    </body>
                </html>
            `
        }

        if (css) {
            html = html.includes("</head>")
                ? html.replace("</head>", `<style>${css}</style></head>`)
                : `<style>${css}</style>${html}`
        }

        if (js) {
            const script = `<script>\n${js}\n</script>`
            html = html.includes("</body>")
                ? html.replace("</body>", `${script}</body>`)
                : html + script
        }

        return html
    }, [tree])

    return (
        <div className='flex h-full w-full flex-col bg-white'>
            <div className='flex h-10 shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] bg-[#111113] px-3'>
                <div className='flex items-center gap-2 shrink-0'>
                    <div className='h-2 w-2 rounded-full bg-emerald-400' />
                    <span className='text-xs font-medium text-zinc-300'>
                        {effectiveMode === "static" ? "Static Preview" : "Dev Server Preview"}
                    </span>
                </div>

                {effectiveMode === "server" ? (
                    <div className='flex max-w-sm flex-1 items-center gap-1.5 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs'>
                        <Globe size={13} className="text-zinc-500 shrink-0" />
                        <input
                            type="text"
                            value={serverUrl}
                            onChange={(e) => setServerUrl(e.target.value)}
                            placeholder="http://localhost:5175"
                            className="w-full bg-transparent text-zinc-200 outline-none text-[11px]"
                        />
                        <button
                            type="button"
                            onClick={handleReload}
                            title="Reload preview"
                            className="rounded p-0.5 text-zinc-400 hover:text-white cursor-pointer"
                        >
                            <RotateCw size={12} />
                        </button>
                        <a
                            href={serverUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="Open in new tab"
                            className="rounded p-0.5 text-zinc-400 hover:text-white cursor-pointer"
                        >
                            <ExternalLink size={12} />
                        </a>
                    </div>
                ) : (
                    <div className='flex items-center gap-2 text-[11px] text-zinc-400'>
                        <Code size={13} className="text-zinc-500" />
                        <span className="hidden sm:inline">HTML • CSS • JS (No localhost needed)</span>
                        <button
                            type="button"
                            onClick={handleReload}
                            title="Reload preview"
                            className="rounded p-0.5 text-zinc-400 hover:text-white cursor-pointer"
                        >
                            <RotateCw size={12} />
                        </button>
                    </div>
                )}

                <div className='flex items-center gap-1 rounded-md bg-white/[0.05] p-0.5 text-[11px] shrink-0'>
                    <button
                        type="button"
                        onClick={() => setUserModeOverride("static")}
                        className={`rounded px-2 py-0.5 font-medium transition-colors cursor-pointer ${
                            effectiveMode === "static" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
                        }`}
                    >
                        Static HTML
                    </button>
                    <button
                        type="button"
                        onClick={() => setUserModeOverride("server")}
                        className={`rounded px-2 py-0.5 font-medium transition-colors cursor-pointer ${
                            effectiveMode === "server" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
                        }`}
                    >
                        Dev Server
                    </button>
                </div>
            </div>

            <div className='min-h-0 flex-1 bg-white'>
                {effectiveMode === "server" ? (
                    <iframe
                        key={`server-${iframeKey}-${serverUrl}`}
                        title="Project Dev Server Preview"
                        src={serverUrl}
                        sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                        className="h-full w-full border-0"
                    />
                ) : (
                    <iframe
                        key={`static-${iframeKey}`}
                        title="Project Preview"
                        srcDoc={srcDoc}
                        sandbox="allow-scripts allow-forms allow-modals"
                        className="h-full w-full border-0"
                    />
                )}
            </div>
        </div>
    )
}

export default Preview
