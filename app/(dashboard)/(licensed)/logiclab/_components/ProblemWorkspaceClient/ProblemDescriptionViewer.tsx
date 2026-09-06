import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import Prism from "prismjs";
import { cn } from "@/lib/utils";

import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-java";
import "prismjs/components/prism-python";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-csharp";import { Lock } from "lucide-react";

export function ProblemDescriptionViewer({ content, isSpoilerMode = false }: { content: string; isSpoilerMode?: boolean }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!content) return null;

  // Strip baked-in examples to prevent duplication with sampleTestCases
  let cleanDesc = content;
  const exampleMatch = cleanDesc.match(/(?:\n|^)(?:###\s*)?(?:\*\*)?Example(?:\s+1)?(?:\*\*)?[:\s]*(?:\n|-)/i);
  if (exampleMatch && exampleMatch.index !== undefined) {
    cleanDesc = cleanDesc.substring(0, exampleMatch.index).trim();
  }

  // Replace custom operators to maintain backward compatibility
  const formattedContent = cleanDesc
    .replace(/<=/g, " ≤ ")
    .replace(/>=/g, " ≥ ")
    .replace(/!=/g, " ≠ ")
    .replace(/->/g, " → ")
    .replace(/==/g, " ＝ ");

  return (
    <div className={cn('text-zinc-800 dark:text-zinc-200', 'leading-relaxed', 'text-sm', 'space-y-4', 'font-sans', 'markdown-body')}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({node, ...props}) => <h1 className="text-[28px] leading-tight font-extrabold text-zinc-900 dark:text-zinc-50 mt-10 mb-5 tracking-tight first:mt-0" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-8 mb-4 tracking-tight first:mt-0" {...props} />,
          h3: ({node, ...props}) => <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mt-6 mb-3 tracking-tight first:mt-0" {...props} />,
          p: ({node, ...props}) => <p className="text-zinc-800 dark:text-zinc-200 leading-[1.7] text-[15px] my-4 first:mt-0" {...props} />,
          a: ({node, ...props}) => <a className="text-blue-500 hover:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc pl-6 space-y-1.5 text-zinc-800 dark:text-zinc-200 my-4 first:mt-0" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal pl-6 space-y-1.5 text-zinc-800 dark:text-zinc-200 my-4 first:mt-0" {...props} />,
          li: ({node, ...props}) => <li className="text-[15px]" {...props} />,
          blockquote: ({node, ...props}) => <blockquote className="border-l-[3px] border-zinc-300 dark:border-zinc-700 pl-4 text-zinc-550 dark:text-zinc-400 text-[15px] italic my-4 first:mt-0" {...props} />,
          hr: ({node, ...props}) => <hr className="border-zinc-200 dark:border-zinc-800 my-6" {...props} />,
          table: ({node, ...props}) => (
            <div className="overflow-x-auto my-4 first:mt-0 rounded-md border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-sm border-collapse" {...props} />
            </div>
          ),
          thead: ({node, ...props}) => <thead className="bg-zinc-100/60 dark:bg-zinc-900/40" {...props} />,
          th: ({node, ...props}) => <th className="px-3 py-2 text-left font-semibold text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800" {...props} />,
          td: ({node, ...props}) => <td className="px-3 py-2 text-zinc-750 dark:text-zinc-300 border-t border-zinc-200 dark:border-zinc-800" {...props} />,
          pre: ({node, ref, ...props}: any) => <div className="my-3.5 first:mt-0" {...props} />, // Strip standard pre wrap since we handle it in code
          code({ node, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1].toLowerCase() : "";
            const isBlock = String(children).includes('\n') || match;
            
            if (isBlock) {
              if (isSpoilerMode) {
                return (
                  <div className={cn('my-4', 'rounded-xl', 'overflow-hidden', 'border', 'border-zinc-800/80', 'bg-[#0a0a0a]', 'shadow-inner', 'relative', 'group', 'select-none')}>
                    <div className={cn('flex', 'items-center', 'px-3', 'py-2.5', 'bg-[#18181b]', 'border-b', 'border-zinc-800', 'select-none', 'justify-between')}>
                      <div className={cn('flex', 'gap-1.5', 'mr-3')}>
                        <div className={cn('w-2.5', 'h-2.5', 'rounded-full', 'bg-red-500/80')} />
                        <div className={cn('w-2.5', 'h-2.5', 'rounded-full', 'bg-yellow-500/80')} />
                        <div className={cn('w-2.5', 'h-2.5', 'rounded-full', 'bg-emerald-500/80')} />
                      </div>
                      <span className={cn('text-[10px]', 'text-zinc-500', 'uppercase', 'tracking-widest', 'font-bold')}>
                        LOCKED
                      </span>
                    </div>
                    <div className="absolute inset-0 top-9.25 bg-background/80 backdrop-blur-md z-10 flex flex-col items-center justify-center p-4 text-center">
                      <Lock className="w-6 h-6 text-muted-foreground mb-2" />
                      <p className="text-sm font-semibold text-foreground">Spoiler Locked Code</p>
                      <p className="text-xs text-muted-foreground mt-1">Solve the problem to view attached code.</p>
                    </div>
                    <div className={cn('p-4', 'h-35', 'overflow-hidden', 'opacity-30', 'pointer-events-none')}>
                      <pre className={cn('text-[13px]', 'font-mono', 'whitespace-pre', 'leading-[1.7]', 'font-medium', 'm-0')}>
                        <code className={className} {...props}>{children}</code>
                      </pre>
                    </div>
                  </div>
                );
              }

              let effectiveLang = lang || 'javascript';
              let highlightedCode = String(children).replace(/\n$/, '');
              
              if (mounted) {
                try {
                  if (effectiveLang === 'js') effectiveLang = 'javascript';
                  if (effectiveLang === 'ts') effectiveLang = 'typescript';
                  if (effectiveLang === 'py') effectiveLang = 'python';
                  if (effectiveLang === 'c++') effectiveLang = 'cpp';
                  
                  if (Prism.languages[effectiveLang]) {
                    highlightedCode = Prism.highlight(highlightedCode, Prism.languages[effectiveLang], effectiveLang);
                  } else {
                    effectiveLang = 'javascript';
                    highlightedCode = Prism.highlight(highlightedCode, Prism.languages.javascript, 'javascript');
                  }
                } catch (e) {
                  highlightedCode = highlightedCode.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                }
              }

              return (
                <div className={cn('my-4', 'rounded-xl', 'overflow-hidden', 'border border-zinc-200 dark:border-zinc-800/80', 'bg-zinc-50 dark:bg-[#0a0a0a]', 'shadow-inner')}>
                  <div className={cn('flex', 'items-center', 'px-3', 'py-2.5', 'bg-zinc-100 dark:bg-[#18181b]', 'border-b border-zinc-200 dark:border-zinc-800', 'select-none', 'justify-between')}>
                    <div className={cn('flex', 'gap-1.5', 'mr-3')}>
                      <div className={cn('w-2.5', 'h-2.5', 'rounded-full', 'bg-red-500/80')} />
                      <div className={cn('w-2.5', 'h-2.5', 'rounded-full', 'bg-yellow-500/80')} />
                      <div className={cn('w-2.5', 'h-2.5', 'rounded-full', 'bg-emerald-500/80')} />
                    </div>
                    {lang && (
                      <span className={cn('text-[10px]', 'text-zinc-500 dark:text-zinc-400', 'uppercase', 'tracking-widest', 'font-bold')}>
                        {lang}
                      </span>
                    )}
                  </div>
                  <div className={cn('relative')}>
                    <div className={cn('p-4', 'max-h-96', 'overflow-x-auto', 'scrollbar-thin')}>
                      <pre className={cn('text-[13px]', 'whitespace-pre', 'leading-[1.7]', 'font-medium', 'font-mono', 'm-0', 'bg-transparent', 'text-black dark:text-zinc-100', `language-${effectiveLang}`)}>
                        {mounted ? (
                          <code className={`language-${effectiveLang}`} dangerouslySetInnerHTML={{ __html: highlightedCode }} />
                        ) : (
                          <code className={`language-${effectiveLang}`}>{children}</code>
                        )}
                      </pre>
                    </div>
                  </div>
                </div>
              );
            }
            
            return (
              <code className="bg-emerald-50/80 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded text-[13px] font-mono text-emerald-800 dark:text-emerald-300 border border-emerald-100/80 dark:border-emerald-900/30" {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {formattedContent}
      </ReactMarkdown>
    </div>
  );
}
