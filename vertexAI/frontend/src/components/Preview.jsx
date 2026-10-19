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
            // Collect all JS/JSX files
            const jsFiles = Object.keys(filesMap).filter(k =>
                (k.endsWith(".jsx") || k.endsWith(".tsx") || k.endsWith(".js") || k.endsWith(".ts")) &&
                !k.endsWith("vite.config.js") &&
                !k.endsWith("tailwind.config.js")
            )

            // Find entry component file (App.jsx, App.tsx, or first jsx file)
            const entryKeys = jsFiles.filter(k =>
                k.endsWith("App.jsx") || k.endsWith("App.tsx") || k.endsWith("App.js")
            )
            const mainKey = entryKeys[0] || jsFiles.find(k => k.endsWith(".jsx")) || jsFiles[0] || ""

            // Sub-components to concatenate before App
            const subFiles = jsFiles.filter(k => k !== mainKey && !k.endsWith("main.jsx") && !k.endsWith("index.jsx"))
            subFiles.sort((a, b) => {
                const aIsComp = a.includes("component")
                const bIsComp = b.includes("component")
                if (!aIsComp && bIsComp) return -1
                if (aIsComp && !bIsComp) return 1
                return a.localeCompare(b)
            })

            const cleanCode = (code, filePath) => {
                if (!code) return ""
                const baseName = filePath.replace(/\.[^/.]+$/, "").split("/").pop() || "Component"

                return code
                    .replace(/import\s+React\s*,\s*\{([^}]+)\}\s+from\s+['"][^'"]+['"];?/g, 'const { $1 } = React;')
                    .replace(/import\s+React\s+from\s+['"][^'"]+['"];?/g, '')
                    .replace(/import\s+\{([^}]+)\}\s+from\s+['"]react['"];?/g, 'const { $1 } = React;')
                    .replace(/import\s+\{[^}]+\}\s+from\s+['"]lucide-react['"];?/g, '')
                    .replace(/import\s+['"][^'"]+\.(?:css|scss|less)['"];?/g, '')
                    .replace(/import\s+.*from\s+['"][^'"]+['"];?/g, '')
                    .replace(/import\s+['"][^'"]+['"];?/g, '')
                    .replace(/export\s+default\s+function\s+([A-Za-z0-9_]+)/g, 'function $1')
                    .replace(/export\s+default\s+function\s*\(/g, `function ${baseName}(`)
                    .replace(/export\s+default\s+class\s+([A-Za-z0-9_]+)/g, 'class $1')
                    .replace(/export\s+default\s+([A-Za-z0-9_]+);?/g, '')
                    .replace(/export\s+(const|let|var|function|class)\s+/g, '$1 ')
                    .replace(/export\s*\{[^}]*\};?/g, '')
            }

            const subCodeBundled = subFiles.map(path => {
                const raw = filesMap[path] || ""
                return `\n/* File: ${path} */\n${cleanCode(raw, path)}\n`
            }).join("\n")

            const mainRaw = filesMap[mainKey] || filesMap["src/App.jsx"] || filesMap["App.jsx"] || ""
            const mainCodeCleaned = cleanCode(mainRaw, mainKey || "App")

            // Detect main component name
            const compMatch = mainRaw.match(/export\s+default\s+(?:function\s+)?([A-Za-z0-9_]+)/)
            let rootCompName = compMatch ? compMatch[1] : (mainRaw.match(/function\s+([A-Z][A-Za-z0-9_]+)/)?.[1] || "App")
            if (rootCompName === "default" || !rootCompName) rootCompName = "App"

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
                    <script src="https://unpkg.com/lucide@latest"></script>
                    <style>
                        body { margin: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #09090b; color: #f4f4f5; }
                        ${css}
                    </style>
                </head>
                <body>
                    <div id="root"></div>
                    <script type="text/babel">
                        window.onerror = function(msg, url, line) {
                            const root = document.getElementById('root');
                            if (root) {
                                root.innerHTML = '<div style="margin:24px;padding:20px;background:#18181b;border:1px solid #ef4444;border-radius:12px;color:#fca5a5;font-family:sans-serif;"><h3 style="margin:0 0 8px;color:#ef4444;font-size:15px;font-weight:600;">⚠️ Preview Transpilation Error</h3><p style="margin:0;font-size:13px;font-family:monospace;background:#09090b;padding:12px;border-radius:8px;">' + msg + '</p></div>';
                            }
                        };

                        const { useState, useEffect, useMemo, useRef, useCallback, useContext, createContext } = React;

                        // Dynamic Lucide Proxy
                        const LucideProxy = new Proxy({}, {
                            get: (target, prop) => {
                                if (typeof prop !== 'string' || prop === 'then') return undefined;
                                return function DynamicIcon(props) {
                                    const size = props.size || 18;
                                    const strokeWidth = props.strokeWidth || 2;
                                    const color = props.color || 'currentColor';
                                    const className = props.className || '';

                                    if (window.lucide && window.lucide.icons && window.lucide.icons[prop]) {
                                        const iconDef = window.lucide.icons[prop];
                                        const svgNode = window.lucide.createElement(iconDef, {
                                            width: size,
                                            height: size,
                                            stroke: color,
                                            'stroke-width': strokeWidth,
                                            class: className
                                        });
                                        return React.createElement('span', {
                                            className: 'inline-flex items-center justify-center align-middle',
                                            dangerouslySetInnerHTML: { __html: svgNode.outerHTML }
                                        });
                                    }

                                    return (
                                        <svg
                                            width={size}
                                            height={size}
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke={color}
                                            strokeWidth={strokeWidth}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className={'inline-block align-middle ' + className}
                                        >
                                            <circle cx="12" cy="12" r="9" />
                                            <path d="M12 8v4l3 3" />
                                        </svg>
                                    );
                                };
                            }
                        });

                        const {
                            Car, Star, Shield, MapPin, Fuel, Calendar, Clock, Users, Check,
                            ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Search, Bell,
                            User, Heart, Sparkles, Zap, Award, Info, AlertCircle, ArrowRight,
                            ArrowLeft, Plus, Minus, Trash, Edit, Eye, EyeOff, Filter, RefreshCw
                        } = LucideProxy;

                        class ErrorBoundary extends React.Component {
                            constructor(props) {
                                super(props);
                                this.state = { hasError: false, error: null };
                            }
                            static getDerivedStateFromError(error) {
                                return { hasError: true, error };
                            }
                            componentDidCatch(error, info) {
                                console.error("Preview render error:", error, info);
                            }
                            render() {
                                if (this.state.hasError) {
                                    return (
                                        <div style={{ margin: '24px', padding: '20px', background: '#18181b', border: '1px solid #ef4444', borderRadius: '12px', color: '#fca5a5', fontFamily: 'sans-serif' }}>
                                            <h3 style={{ margin: '0 0 8px', color: '#ef4444', fontSize: '15px', fontWeight: '600' }}>⚠️ Component Render Error</h3>
                                            <p style={{ margin: '0 0 12px', fontSize: '13px', fontFamily: 'monospace', background: '#09090b', padding: '12px', borderRadius: '8px' }}>{this.state.error?.message || String(this.state.error)}</p>
                                            <button onClick={() => window.location.reload()} style={{ padding: '6px 12px', background: '#ef4444', color: '#fff', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px' }}>
                                                Reload Preview
                                            </button>
                                        </div>
                                    );
                                }
                                return this.props.children;
                            }
                        }

                        // Sub-components
                        ${subCodeBundled}

                        // Main Component
                        ${mainCodeCleaned}

                        try {
                            const rootEl = document.getElementById('root');
                            if (typeof ${rootCompName} !== 'undefined') {
                                ReactDOM.createRoot(rootEl).render(
                                    <ErrorBoundary>
                                        <${rootCompName} />
                                    </ErrorBoundary>
                                );
                            } else {
                                rootEl.innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8;">No export found in main component.</div>';
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
