import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileBottomNav } from "./MobileBottomNav";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const isMobile = useIsMobile();
  
  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="min-h-screen flex w-full mesh-gradient-light dark:mesh-gradient-dark">
        <Sidebar />
        <div className="flex-1 flex flex-col w-full">
          <Header />
          <main className="flex-1 pt-14 md:pt-16 pb-20 md:pb-0">
            <div className="px-3 md:px-4 pt-0 pb-1">{children}</div>
          </main>
        </div>
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}
