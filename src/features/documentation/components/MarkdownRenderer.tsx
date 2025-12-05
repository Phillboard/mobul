import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Check, Info, AlertTriangle, AlertCircle, Lightbulb } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@shared/utils/cn';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Parse callout blocks (> [!NOTE], > [!TIP], etc.)
  const parseCallouts = (text: string) => {
    const calloutRegex = /^>\s*\[!(NOTE|TIP|WARNING|CAUTION|INFO)\]\s*\n((?:>\s*.*\n?)*)/gim;
    return text.replace(calloutRegex, (match, type, content) => {
      const cleanContent = content.replace(/^>\s*/gm, '').trim();
      return `<div data-callout="${type.toLowerCase()}">${cleanContent}</div>`;
    });
  };

  const processedContent = parseCallouts(content);

  return (
    <div className={cn("prose prose-slate dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          div(props) {
            const { children, ...rest } = props;
            const calloutType = (rest as any)['data-callout'];
            
            if (calloutType) {
              const icons = {
                note: <Info className="h-4 w-4" />,
                tip: <Lightbulb className="h-4 w-4" />,
                warning: <AlertTriangle className="h-4 w-4" />,
                caution: <AlertCircle className="h-4 w-4" />,
                info: <Info className="h-4 w-4" />,
              };
              
              const variants = {
                note: 'default',
                tip: 'default',
                warning: 'destructive',
                caution: 'destructive',
                info: 'default',
              } as const;
              
              return (
                <Alert variant={variants[calloutType as keyof typeof variants] || 'default'} className="my-4">
                  {icons[calloutType as keyof typeof icons]}
                  <AlertDescription>{children}</AlertDescription>
                </Alert>
              );
            }
            
            return <div {...rest}>{children}</div>;
          },
          code(props) {
            const { children, className, ...rest } = props;
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            const inline = !className;
            
            return !inline && match ? (
              <div className="relative group my-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => copyCode(codeString)}
                >
                  {copiedCode === codeString ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <SyntaxHighlighter
                  style={vscDarkPlus as any}
                  language={match[1]}
                  PreTag="div"
                >
                  {codeString}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className={cn("px-1.5 py-0.5 rounded-md bg-muted text-foreground font-mono text-sm", className)} {...rest}>
                {children}
              </code>
            );
          },
          a(props) {
            const { children, href, ...rest } = props;
            const isExternal = href?.startsWith('http');
            return (
              <a
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className="text-primary hover:underline"
                {...rest}
              >
                {children}
              </a>
            );
          },
          p(props) {
            return <p className="my-4 leading-7" {...props} />;
          },
          h2(props) {
            return <h2 className="mt-10 mb-4 text-2xl font-bold tracking-tight" {...props} />;
          },
          h3(props) {
            return <h3 className="mt-8 mb-3 text-xl font-semibold tracking-tight" {...props} />;
          },
          hr() {
            return <hr className="my-8 border-border" />;
          },
          table(props) {
            return (
              <div className="my-6 w-full overflow-x-auto">
                <table className="w-full border-collapse" {...props} />
              </div>
            );
          },
          thead(props) {
            return <thead className="bg-muted" {...props} />;
          },
          tbody(props) {
            return <tbody {...props} />;
          },
          tr(props) {
            return <tr className="border-b border-border" {...props} />;
          },
          th(props) {
            return <th className="px-4 py-3 text-left font-semibold text-sm" {...props} />;
          },
          td(props) {
            return <td className="px-4 py-3 text-sm" {...props} />;
          },
          ul(props) {
            return <ul className="my-4 ml-6 list-disc space-y-2" {...props} />;
          },
          ol(props) {
            return <ol className="my-4 ml-6 list-decimal space-y-2" {...props} />;
          },
          li(props) {
            return <li className="leading-7" {...props} />;
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
