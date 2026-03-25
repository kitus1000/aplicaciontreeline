import { Sidebar } from '@/components/Sidebar'
import { FuturisticLoader } from '@/components/FuturisticLoader'
import { GlobalBackButton } from '@/components/GlobalBackButton'
import { LanguageToggle } from '@/components/LanguageToggle'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex h-screen bg-[#0f172a] relative overflow-hidden">
            {/* Global Background Grid */}
            <div className="absolute inset-0 construction-grid opacity-20 pointer-events-none z-0"></div>
            
            <FuturisticLoader />
            <GlobalBackButton />
            <LanguageToggle />
            <Sidebar />
            
            <main className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10 scrollbar-hide">
                {children}
            </main>
        </div>
    )
}
