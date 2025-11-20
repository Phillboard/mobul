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
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col w-full">
          <Header />
          <main className="flex-1 pt-14 md:pt-16 pb-20 md:pb-0">
            <div className="p-3 md:p-4">{children}</div>
          </main>
        </div>
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}
