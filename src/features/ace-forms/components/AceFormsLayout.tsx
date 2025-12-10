import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/shared/components/ui/sidebar";
import { AceFormsSidebar } from "./AceFormsSidebar";

interface AceFormsLayoutProps {
  children: ReactNode;
}

export function AceFormsLayout({ children }: AceFormsLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <AceFormsSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b px-4">
            <SidebarTrigger />
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
