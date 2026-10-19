import React, { useMemo, useState, useEffect } from 'react'
import { RotateCw, Globe, Code, ExternalLink, Sparkles } from 'lucide-react'

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

    const [userModeOverride, setUserModeOverride] = useState(null)
    const [serverUrl, setServerUrl] = useState("http://localhost:5173")
    const [iframeKey, setIframeKey] = useState(0)

    useEffect(() => {
        setUserModeOverride(null)
    }, [tree])

    // Default to Localhost Dev Server for Vite/React projects (as user expects)
    const effectiveMode = userModeOverride || (isReactOrServerProject ? "server" : "static")

    const handleReload = () => {
        setIframeKey(k => k + 1)
    }

    const srcDoc = useMemo(() => {
        if (!tree || tree.length === 0) {
            return `
                <!DOCTYPE html>
                <html>
                <body style="margin:0;background:#09090b;color:#a1a1aa;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
                    <div style="text-align:center;">
                        <div style="width:32px;height:32px;border:2px solid #38bdf8;border-top-color:transparent;border-radius:50%;margin:0 auto 12px;animation:spin 1s linear infinite;"></div>
                        <p style="margin:0;font-size:13px;">Loading project files...</p>
                        <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
                    </div>
                </body>
                </html>
            `
        }

        let html = ""
        let css = ""
        let js = ""
        const filesByPath = {}

        const walk = (items = [], currentPath = "") => {
            for (const item of items) {
                const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name
                if (item.type === "file") {
                    filesByPath[itemPath] = {
                        name: item.name,
                        path: itemPath,
                        content: item.content || ""
                    }
                    if (item.name === "index.html") html = item.content || ""
                    if (item.name.endsWith(".css")) css += "\n" + (item.content || "")
                    if (item.name.endsWith(".js") && !item.name.endsWith(".jsx")) js += "\n" + (item.content || "")
                }
                if (item.children?.length) walk(item.children, itemPath)
            }
        }

        walk(tree)

        const allFiles = Object.values(filesByPath)
        const jsxFiles = allFiles.filter(f => f.name.endsWith(".jsx") || f.name.endsWith(".tsx"))
        const isReact = jsxFiles.length > 0 || allFiles.some(f => f.name === "package.json" && (f.content.includes("react") || f.content.includes("vite")))

        if (isReact) {
            // Find main entry component (e.g. App.jsx, App.tsx, or first .jsx file)
            const mainFile = jsxFiles.find(f => f.name.startsWith("App.") || f.name === "App.jsx" || f.name === "App.tsx")
                || jsxFiles.find(f => f.name !== "main.jsx" && f.name !== "index.jsx" && f.name !== "main.tsx" && f.name !== "index.tsx")
                || jsxFiles[0]

            const mainPath = mainFile?.path

            // Sub-components: all other .jsx, .tsx, .js files
            const subFiles = allFiles.filter(f =>
                f.path !== mainPath &&
                (f.name.endsWith(".jsx") || f.name.endsWith(".tsx") || f.name.endsWith(".js")) &&
                !f.name.endsWith(".config.js") &&
                !f.name.endsWith(".config.ts") &&
                f.name !== "main.jsx" &&
                f.name !== "index.jsx" &&
                f.name !== "main.tsx" &&
                f.name !== "index.tsx"
            )

            // Deduplicate subfiles by filename to ensure no duplicate components
            const uniqueSubFiles = []
            const seenNames = new Set()
            for (const f of subFiles) {
                if (!seenNames.has(f.name)) {
                    seenNames.add(f.name)
                    uniqueSubFiles.push(f)
                }
            }

            uniqueSubFiles.sort((a, b) => {
                const aIsComp = a.path.includes("component")
                const bIsComp = b.path.includes("component")
                if (!aIsComp && bIsComp) return -1
                if (aIsComp && !bIsComp) return 1
                return a.name.localeCompare(b.name)
            })

            const cleanCode = (code, filePath) => {
                if (!code) return ""
                const baseName = filePath.replace(/\.[^/.]+$/, "").split("/").pop() || "Component"

                return code
                    .replace(/import\s*[\s\S]*?from\s*['"][^'"]+['"];?/g, '')
                    .replace(/import\s*['"][^'"]+['"];?/g, '')
                    .replace(/export\s+default\s+function\s+([A-Za-z0-9_]+)/g, 'function $1')
                    .replace(/export\s+default\s+function\s*\(/g, `function ${baseName}(`)
                    .replace(/export\s+default\s+class\s+([A-Za-z0-9_]+)/g, 'class $1')
                    .replace(/export\s+default\s+([A-Za-z0-9_]+);?/g, '')
                    .replace(/export\s+(const|let|var|function|class)\s+/g, '$1 ')
                    .replace(/export\s*\{[^}]*\};?/g, '')
            }

            const subCodeBundled = uniqueSubFiles.map(file => {
                return `\n/* File: ${file.path} */\n${cleanCode(file.content, file.path)}\n`
            }).join("\n")

            const mainRaw = mainFile?.content || ""
            const mainCodeCleaned = cleanCode(mainRaw, mainFile?.path || "App")

            // Detect main component name
            const compMatch = mainRaw.match(/export\s+default\s+(?:function\s+)?([A-Za-z0-9_]+)/)
            let rootCompName = compMatch ? compMatch[1] : (mainRaw.match(/function\s+([A-Z][A-Za-z0-9_]+)/)?.[1] || "App")
            if (rootCompName === "default" || !rootCompName) rootCompName = "App"

            const rawBundleCode = `
                const { useState, useEffect, useMemo, useRef, useCallback, useContext, createContext } = React;

                // Universal Lucide SVG Proxy
                const LucideProxy = new Proxy({}, {
                    get: (target, prop) => {
                        if (typeof prop !== 'string' || prop === 'then' || prop === 'prototype') return undefined;
                        return function DynamicLucideIcon(props) {
                            const p = props || {};
                            const size = p.size || 18;
                            const strokeWidth = p.strokeWidth || 2;
                            const color = p.color || 'currentColor';
                            const className = p.className || '';

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

                            return React.createElement('svg', {
                                width: size,
                                height: size,
                                viewBox: '0 0 24 24',
                                fill: 'none',
                                stroke: color,
                                strokeWidth: strokeWidth,
                                strokeLinecap: 'round',
                                strokeLinejoin: 'round',
                                className: 'inline-block align-middle ' + className
                            }, React.createElement('circle', { cx: 12, cy: 12, r: 8 }), React.createElement('path', { d: 'M12 8v4l2 2' }));
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

                const rootEl = document.getElementById('root');
                if (typeof ${rootCompName} !== 'undefined') {
                    ReactDOM.createRoot(rootEl).render(
                        <ErrorBoundary>
                            <${rootCompName} />
                        </ErrorBoundary>
                    );
                } else {
                    rootEl.innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8;">No root component found. Ensure App.jsx exports a component.</div>';
                }
            `

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
                    <script>
                        window.onerror = function(msg, url, line, col, err) {
                            var root = document.getElementById('root');
                            if (root && (!root.innerHTML || root.innerHTML.trim() === '')) {
                                root.innerHTML = '<div style="margin:20px;padding:20px;background:#18181b;border:1px solid #ef4444;border-radius:10px;color:#fca5a5;font-family:sans-serif;">' +
                                    '<h3 style="margin:0 0 8px;color:#ef4444;font-size:15px;font-weight:600;">⚠️ Script Execution Error</h3>' +
                                    '<p style="margin:0;font-size:13px;font-family:monospace;background:#09090b;padding:12px;border-radius:6px;white-space:pre-wrap;">' + (err ? err.message : msg) + '</p>' +
                                '</div>';
                            }
                        };
                    </script>
                </head>
                <body>
                    <div id="root"></div>

                    <script id="preview-bundle-source" type="text/plain">
${rawBundleCode}
                    </script>

                    <script>
                        document.addEventListener('DOMContentLoaded', function() {
                            var rootEl = document.getElementById('root');
                            try {
                                var source = document.getElementById('preview-bundle-source').textContent;
                                var compiled = Babel.transform(source, {
                                    presets: ['react', 'env'],
                                    filename: 'preview-bundle.jsx'
                                }).code;

                                var runner = new Function('React', 'ReactDOM', 'LucideProxy', 'require', compiled);
                                runner(React, ReactDOM, LucideProxy, function(mod) {
                                    if (mod === 'react') return React;
                                    if (mod && String(mod).indexOf('lucide') !== -1) return LucideProxy;
                                    return {};
                                });
                            } catch (err) {
                                console.error("Preview Bundle Error:", err);
                                if (rootEl) {
                                    rootEl.innerHTML = '<div style="margin:24px;padding:20px;background:#18181b;border:1px solid #ef4444;border-radius:12px;color:#fca5a5;font-family:sans-serif;">' +
                                        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">' +
                                            '<span style="font-size:20px;">⚠️</span>' +
                                            '<h3 style="margin:0;color:#ef4444;font-size:16px;font-weight:600;">Live Preview Error</h3>' +
                                        '</div>' +
                                        '<p style="margin:0 0 12px;font-size:13px;font-family:monospace;background:#09090b;padding:12px;border-radius:8px;white-space:pre-wrap;line-height:1.5;">' + (err.message || String(err)) + '</p>' +
                                        '<button onclick="window.location.reload()" style="padding:6px 12px;background:#ef4444;color:#fff;border-radius:6px;border:none;cursor:pointer;font-size:12px;font-weight:500;">Reload Preview</button>' +
                                    '</div>';
                                }
                            }
                        });
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
            <div className='flex h-11 shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] bg-[#111113] px-3 pr-44'>
                <div className='flex items-center gap-2 shrink-0'>
                    <div className='flex items-center gap-1 rounded-md bg-white/[0.06] p-0.5 text-[11px]'>
                        <button
                            type="button"
                            onClick={() => setUserModeOverride("server")}
                            className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                                effectiveMode === "server" ? "bg-zinc-800 text-sky-400 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                            }`}
                        >
                            <Globe size={12} />
                            <span>Localhost (Dev Server)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setUserModeOverride("static")}
                            className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                                effectiveMode === "static" ? "bg-zinc-800 text-emerald-400 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                            }`}
                        >
                            <Sparkles size={12} />
                            <span>Live Preview</span>
                        </button>
                    </div>
                </div>

                {effectiveMode === "server" ? (
                    <div className='flex max-w-md flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/50 px-2.5 py-1 text-xs'>
                        <Globe size={13} className="text-sky-400 shrink-0" />
                        <input
                            type="text"
                            value={serverUrl}
                            onChange={(e) => setServerUrl(e.target.value)}
                            placeholder="http://localhost:5173"
                            className="w-full bg-transparent text-zinc-100 outline-none text-[12px] font-mono"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                type="button"
                                onClick={() => setServerUrl("http://localhost:5173")}
                                className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer ${serverUrl.includes("5173") ? "bg-sky-500/20 text-sky-300 font-bold" : "text-zinc-500 hover:text-zinc-300"}`}
                            >
                                5173
                            </button>
                            <button
                                type="button"
                                onClick={() => setServerUrl("http://localhost:5175")}
                                className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer ${serverUrl.includes("5175") ? "bg-sky-500/20 text-sky-300 font-bold" : "text-zinc-500 hover:text-zinc-300"}`}
                            >
                                5175
                            </button>
                            <button
                                type="button"
                                onClick={handleReload}
                                title="Reload preview"
                                className="rounded p-1 text-zinc-400 hover:text-white cursor-pointer"
                            >
                                <RotateCw size={12} />
                            </button>
                            <a
                                href={serverUrl}
                                target="_blank"
                                rel="noreferrer"
                                title="Open in new tab"
                                className="rounded p-1 text-zinc-400 hover:text-white cursor-pointer"
                            >
                                <ExternalLink size={12} />
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className='flex items-center gap-2 text-[11px] text-zinc-400'>
                        <Code size={13} className="text-emerald-400" />
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
