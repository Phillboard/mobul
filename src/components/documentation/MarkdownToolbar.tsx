import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  Code,
  Link,
  Quote,
  Table,
  Image,
} from "lucide-react";

interface MarkdownToolbarProps {
  onInsert: (before: string, after?: string) => void;
}

export function MarkdownToolbar({ onInsert }: MarkdownToolbarProps) {
  return (
    <div className="flex items-center gap-1 p-2 border rounded-lg bg-muted/50">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onInsert("**", "**")}
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onInsert("*", "*")}
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <div className="w-px h-6 bg-border mx-1" />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onInsert("\n## ", "")}
        title="Heading"
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <div className="w-px h-6 bg-border mx-1" />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onInsert("\n- ", "")}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onInsert("\n1. ", "")}
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <div className="w-px h-6 bg-border mx-1" />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onInsert("`", "`")}
        title="Inline Code"
      >
        <Code className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onInsert("\n```\n", "\n```\n")}
        title="Code Block"
      >
        <Code className="h-4 w-4" />
      </Button>
      <div className="w-px h-6 bg-border mx-1" />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onInsert("[", "](url)")}
        title="Link"
      >
        <Link className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onInsert("![alt](", ")")}
        title="Image"
      >
        <Image className="h-4 w-4" />
      </Button>
      <div className="w-px h-6 bg-border mx-1" />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onInsert("\n> ", "")}
        title="Quote"
      >
        <Quote className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          onInsert(
            "\n| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n",
            ""
          )
        }
        title="Table"
      >
        <Table className="h-4 w-4" />
      </Button>
    </div>
  );
}
