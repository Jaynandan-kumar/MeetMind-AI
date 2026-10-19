import React, { useMemo, useState, useEffect } from 'react'
import { RotateCw, Globe, Code } from 'lucide-react'

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

    // State for preview mode ("static" by default for instant zero-dependency in-browser render, or "server" for custom localhost)
    const [userModeOverride, setUserModeOverride] = useState(null)
    const [serverUrl, setServerUrl] = useState("http://localhost:5175")
    const [iframeKey, setIframeKey] = useState(0)

    // Reset override when tree/project changes
    useEffect(() => {
        setUserModeOverride(null)
    }, [tree])

    const effectiveMode = userModeOverride || "static"

    const handleReload = () => {
        setIframeKey(k => k + 1)
    }

    const srcDoc = useMemo(() => {
        let html = ""
        let css = ""
        let js = ""
        const filesMap = {}

        const walk = (items = [], currentPath = "") => {
            for (const item of items) {
                const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name
                if (item.type === "file") {
                    filesMap[item.name] = item.content || ""
                    filesMap[itemPath] = item.content || ""
                    if (item.name === "index.html") html = item.content || ""
                    if (item.name.endsWith(".css")) css += "\n" + (item.content || "")
                    if (item.name.endsWith(".js") && !item.name.endsWith(".jsx")) js += "\n" + (item.content || "")
                }
                if (item.children?.length) walk(item.children, itemPath)
            }
        }

        walk(tree)

        // Check if project has React JSX files
        const jsxFileNames = Object.keys(filesMap).filter(k => k.endsWith(".jsx") || k.endsWith(".tsx"))
        const isReact = jsxFileNames.length > 0 || Object.keys(filesMap).some(k => k === "package.json" && (filesMap[k].includes("react") || filesMap[k].includes("vite")))

        if (isReact) {
            // Find main React code (App.jsx, App.js, main.jsx, or first jsx file)
            const appKey = jsxFileNames.find(k => k.endsWith("App.jsx") || k.endsWith("App.tsx")) || jsxFileNames[0] || ""
            const appCode = filesMap[appKey] || filesMap["src/App.jsx"] || filesMap["App.jsx"] || ""

            // Clean imports from appCode so it runs standalone with global React / Lucide
            const cleanedCode = (appCode || "")
                .replace(/import\s+React\s*,\s*\{([^}]+)\}\s+from\s+['"][^'"]+['"];?/g, 'const { $1 } = React;')
                .replace(/import\s+React\s+from\s+['"][^'"]+['"];?/g, '')
                .replace(/import\s+\{([^}]+)\}\s+from\s+['"]react['"];?/g, 'const { $1 } = React;')
                .replace(/import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"];?/g, (match, icons) => {
                    const iconList = icons.split(',').map(i => i.trim()).filter(Boolean);
                    return iconList.map(i => `const ${i} = (props) => React.createElement('span', { className: 'inline-flex items-center text-xs opacity-75', ...props }, '[${i}]');`).join('\n');
                })
                .replace(/import\s+.*from\s+['"][^'"]+['"];?/g, '')
                .replace(/export\s+default\s+function\s+([A-Za-z0-9_]+)/g, 'function $1')
                .replace(/export\s+default\s+([A-Za-z0-9_]+);?/g, '')

            // Detect main component name
            const compMatch = appCode.match(/export\s+default\s+(?:function\s+)?([A-Za-z0-9_]+)/)
            const rootCompName = compMatch ? compMatch[1] : (appCode.match(/function\s+([A-Z][A-Za-z0-9_]+)/)?.[1] || "App")

            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <script src="https://cdn.tailwindcss.com"></script>
                    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
                    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
                    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
                    <style>
                        body { margin: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; }
                        ${css}
                    </style>
                </head>
                <body>
                    <div id="root"></div>
                    <script type="text/babel">
                        try {
                            ${cleanedCode}

                            const rootEl = document.getElementById('root');
                            if (typeof ${rootCompName} !== 'undefined') {
                                ReactDOM.createRoot(rootEl).render(React.createElement(${rootCompName}));
                            } else {
                                rootEl.innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8;">Component loaded.</div>';
                            }
                        } catch (err) {
                            document.getElementById('root').innerHTML = '<div style="padding:24px;color:#ef4444;font-family:monospace;background:#1e1e24;border-radius:8px;margin:20px;"><b>Preview Error:</b><br/>' + err.message + '</div>';
                        }
                    </script>
                </body>
                </html>
            `
        }

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
                        {effectiveMode === "static" ? "Instant Live Preview" : "Dev Server Preview"}
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
                    </div>
                ) : (
                    <div className='flex items-center gap-2 text-[11px] text-zinc-400'>
                        <Code size={13} className="text-zinc-500" />
                        <span className="hidden sm:inline">Instant React + Tailwind Live Rendering</span>
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
                        Live Preview
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
