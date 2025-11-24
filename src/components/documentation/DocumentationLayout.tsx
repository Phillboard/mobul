import { ReactNode } from "react";
import { DocumentationSidebar } from "./DocumentationSidebar";
import { DocumentationSearch } from "./DocumentationSearch";

interface DocumentationLayoutProps {
  children: ReactNode;
}

export function DocumentationLayout({ children }: DocumentationLayoutProps) {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="flex flex-col w-64 border-r border-border bg-background">
        <div className="p-4 border-b border-border">
          <DocumentationSearch />
        </div>
        <DocumentationSidebar />
      </div>
      {children}
    </div>
  );
}
