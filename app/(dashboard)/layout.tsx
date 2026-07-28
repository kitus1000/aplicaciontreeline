'use client'

import { Sidebar } from '@/components/Sidebar'
import { FuturisticLoader } from '@/components/FuturisticLoader'
import { GlobalBackButton } from '@/components/GlobalBackButton'
import { RoleGuard } from '@/components/RoleGuard'
import { ThemeProvider } from '@/context/ThemeContext'
import { ImpersonationProvider } from '@/context/ImpersonationContext'
import { ExecutiveHeader } from '@/components/ExecutiveHeader'
import { ExecutivePreviewBanner } from '@/components/ExecutivePreviewBanner'
import { MobileNavigation } from '@/components/MobileNavigation'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <ThemeProvider>
            <ImpersonationProvider>
                <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-main)] relative overflow-hidden transition-colors duration-300">
                    {/* Background Grid */}
                    <div className="absolute inset-0 construction-grid opacity-30 pointer-events-none z-0"></div>
                    
                    <FuturisticLoader />
                    <GlobalBackButton />
                    
                    {/* Desktop Sidebar */}
                    <Sidebar />
                    
                    <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
                        {/* Executive Topbar */}
                        <ExecutiveHeader />

                        {/* Executive Worker View Banner */}
                        <ExecutivePreviewBanner />
                        
                        {/* Main Content Area */}
                        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8 scrollbar-hide">
                            <RoleGuard>
                                {children}
                            </RoleGuard>
                        </main>
                        
                        {/* Mobile Navigation */}
                        <MobileNavigation />
                    </div>
                </div>
            </ImpersonationProvider>
        </ThemeProvider>
    )
}
