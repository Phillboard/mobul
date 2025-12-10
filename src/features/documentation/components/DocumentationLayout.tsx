import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Settings } from "lucide-react";
import { DocumentationSidebar } from "./DocumentationSidebar";
import { DocumentationSearch } from "./DocumentationSearch";
import { Button } from "@/shared/components/ui/button";

interface DocumentationLayoutProps {
  children: ReactNode;
}

export function DocumentationLayout({ children }: DocumentationLayoutProps) {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="flex flex-col w-64 border-r border-border bg-background">
        <div className="p-4 border-b border-border space-y-2">
          <DocumentationSearch />
          <Link to="/admin/docs/manage">
            <Button variant="outline" size="sm" className="w-full">
              <Settings className="h-4 w-4 mr-2" />
              Manage Docs
            </Button>
          </Link>
        </div>
        <DocumentationSidebar />
      </div>
      {children}
    </div>
  );
}
