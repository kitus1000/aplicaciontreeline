'use client'

import { FolderLock, Heart, Code2, Database, Layout, ShieldCheck, Mail } from 'lucide-react'

export default function AboutPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-12 py-8 page-transition">
            {/* Hero Section */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center p-6 bg-indigo-600 rounded-3xl shadow-2xl shadow-indigo-500/20 mb-4 animate-pulse neon-border">
                    <ShieldCheck className="w-12 h-12 text-white" />
                </div>
                <h1 className="text-6xl font-black text-white tracking-tighter uppercase italic">
                    Worktrack <span className="text-indigo-400">PRO</span>
                </h1>
                <p className="text-xl text-slate-400 font-bold tracking-widest uppercase">Version 2.0.0 "Global Enterprise"</p>
                <div className="h-1.5 w-32 bg-gradient-to-r from-indigo-500 to-purple-500 mx-auto rounded-full"></div>
            </div>

            {/* Credits Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass-dark p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
                    <div className="flex items-center space-x-3 text-white font-bold text-xl uppercase tracking-wider">
                        <Code2 className="text-indigo-400" />
                        <h2>Software & Design</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="group">
                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em]">Developed by:</p>
                            <p className="text-2xl font-black text-white group-hover:text-indigo-400 transition-colors tracking-tight">Worktrack RH Solutions</p>
                        </div>
                        <p className="text-slate-400 leading-relaxed font-medium">
                            Designed to optimize Human Capital processes in the US market, 
                            automating evidence management, receipts, and real-time attendance 
                            tracking with a mobile-first approach.
                        </p>
                        <div className="flex items-center space-x-4 pt-4 border-t border-slate-800/50">
                            <a href="#" className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20">
                                <Mail className="w-5 h-5" />
                            </a>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6 text-slate-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                       <Database className="w-32 h-32" />
                    </div>
                    <div className="flex items-center space-x-3 text-white font-bold text-xl uppercase tracking-wider">
                        <Database className="text-indigo-400" />
                        <h2>Core Technologies</h2>
                    </div>
                    <ul className="space-y-4 relative z-10">
                        <li className="flex items-center space-x-3">
                            <div className="p-2 bg-indigo-500/10 rounded-lg"><Layout className="w-5 h-5 text-indigo-400 shrink-0" /></div>
                            <span className="text-sm font-bold uppercase tracking-tighter"><strong className="text-white">Front-End:</strong> Next.js 15 & Tailwind CSS</span>
                        </li>
                        <li className="flex items-center space-x-3">
                            <div className="p-2 bg-purple-500/10 rounded-lg"><Database className="w-5 h-5 text-purple-400 shrink-0" /></div>
                            <span className="text-sm font-bold uppercase tracking-tighter"><strong className="text-white">Data Engine:</strong> Supabase (Real-time)</span>
                        </li>
                        <li className="flex items-center space-x-3">
                            <div className="p-2 bg-cyan-500/10 rounded-lg"><ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0" /></div>
                            <span className="text-sm font-bold uppercase tracking-tighter"><strong className="text-white">Security:</strong> Auth & Storage RLS</span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Footer Credit */}
            <div className="flex flex-col items-center justify-center space-y-4 py-8 border-t border-slate-800 font-medium">
                <div className="text-slate-500 text-[10px] font-black uppercase tracking-[0.5em]">
                    Developed & Managed by:
                </div>
                <div className="text-white font-black italic tracking-widest text-2xl uppercase">
                   J. Raul Mtz M
                </div>
                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">© 2026 Worktrack PRO - All rights reserved.</p>
            </div>
        </div>
    )
}
