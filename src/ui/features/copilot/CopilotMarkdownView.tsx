import React from 'react';
import { Award, Sparkles, AlertTriangle, Activity } from 'lucide-react';

interface Props {
  content: string;
}

export const CopilotMarkdownView: React.FC<Props> = ({ content }) => {
  const elements: React.ReactNode[] = [];
  const lines = content.split('\n');

  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Empty line
    if (!trimmed) {
      i++;
      continue;
    }

    // 2. Horizontal Divider (--- or ***)
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      elements.push(
        <div key={`hr-${i}`} className="py-2.5">
          <div className="h-[1px] bg-gradient-to-r from-transparent via-slate-300 dark:via-zinc-700 to-transparent" />
        </div>
      );
      i++;
      continue;
    }

    // 3. Markdown Tables (| Col 1 | Col 2 |)
    if (trimmed.startsWith('|') && trimmed.includes('|', 1)) {
      const tableLines: string[] = [];
      while (i < lines.length) {
        const cur = lines[i].trim();
        if (!cur) {
          // Check if next non-empty line is still a table row
          let nextIdx = i + 1;
          while (nextIdx < lines.length && !lines[nextIdx].trim()) nextIdx++;
          if (nextIdx < lines.length && lines[nextIdx].trim().startsWith('|')) {
            i = nextIdx;
            continue;
          }
          break;
        }
        if (cur.startsWith('|')) {
          tableLines.push(cur);
          i++;
        } else {
          break;
        }
      }

      if (tableLines.length >= 2) {
        elements.push(renderTable(`table-${i}`, tableLines));
      }
      continue;
    }

    // 4. Headings
    if (trimmed.startsWith('# ')) {
      elements.push(
        <div key={`h1-${i}`} className="pt-3 pb-1">
          <h1 className="text-sm font-black text-slate-900 dark:text-zinc-50 tracking-tight flex items-center space-x-2">
            <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500 shadow-xs" />
            <span>{formatInline(trimmed.slice(2))}</span>
          </h1>
        </div>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      elements.push(
        <div key={`h2-${i}`} className="pt-2.5 pb-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-zinc-100 flex items-center space-x-2">
            <span className="w-1.5 h-3.5 rounded-full bg-gradient-to-b from-indigo-500 to-purple-500 shadow-xs" />
            <span>{formatInline(trimmed.slice(3))}</span>
          </h2>
        </div>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <div key={`h3-${i}`} className="pt-2 pb-0.5">
          <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-slate-800 dark:text-zinc-200 flex items-center space-x-1.5">
            <span className="w-1 h-2.5 rounded-full bg-indigo-500" />
            <span>{formatInline(trimmed.slice(4))}</span>
          </h3>
        </div>
      );
      i++;
      continue;
    }

    // 5. Medical Callout Headers (e.g. BOARD EXAM RULE, MEMORY ANCHOR, WHY YOU PICKED, IN 30 SECONDS)
    const upper = trimmed.toUpperCase();
    if (
      upper.startsWith('BOARD EXAM RULE') ||
      upper.startsWith('HIGH-YIELD RULE')
    ) {
      elements.push(
        <div key={`callout-rule-${i}`} className="my-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 shadow-2xs">
          <div className="flex items-center space-x-1.5 text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
            <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>{trimmed}</span>
          </div>
        </div>
      );
      i++;
      continue;
    }

    if (upper.startsWith('MEMORY ANCHOR') || upper.startsWith('MNEMONIC:')) {
      elements.push(
        <div key={`callout-anchor-${i}`} className="my-2.5 p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 shadow-2xs">
          <div className="flex items-center space-x-1.5 text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 animate-pulse" />
            <span>{formatInline(trimmed)}</span>
          </div>
        </div>
      );
      i++;
      continue;
    }

    if (upper.startsWith('WHY YOU PICKED') || upper.startsWith('DISTRACTOR TRAP')) {
      elements.push(
        <div key={`callout-trap-${i}`} className="my-2.5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 shadow-2xs">
          <div className="flex items-center space-x-1.5 text-[11px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{trimmed}</span>
          </div>
        </div>
      );
      i++;
      continue;
    }

    if (upper.includes('IN 30 SECONDS') || upper.startsWith('CORE CONCEPT')) {
      elements.push(
        <div key={`callout-concept-${i}`} className="pt-2 pb-1">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-extrabold uppercase tracking-wider">
            <Activity className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{trimmed}</span>
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 6. Blockquotes (> quote)
    if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="my-2 pl-3 py-1.5 border-l-2 border-indigo-500 bg-indigo-50/50 dark:bg-zinc-900/40 text-xs italic text-slate-700 dark:text-zinc-300 rounded-r-xl"
        >
          {formatInline(trimmed.slice(2))}
        </blockquote>
      );
      i++;
      continue;
    }

    // 7. Lists (Unordered & Numbered)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
      const listItems: { isNumbered: boolean; text: string }[] = [];
      while (i < lines.length) {
        const cur = lines[i].trim();
        if (cur.startsWith('- ') || cur.startsWith('* ')) {
          listItems.push({ isNumbered: false, text: cur.slice(2) });
          i++;
        } else if (/^\d+\.\s/.test(cur)) {
          listItems.push({ isNumbered: true, text: cur.replace(/^\d+\.\s/, '') });
          i++;
        } else {
          break;
        }
      }

      elements.push(
        <ul key={`list-${i}`} className="space-y-1.5 my-2 pl-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start space-x-2 text-xs leading-relaxed text-slate-700 dark:text-zinc-300">
              {item.isNumbered ? (
                <span className="w-4 h-4 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 border border-indigo-500/20">
                  {idx + 1}
                </span>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 shrink-0 mt-1.5 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
              )}
              <span className="flex-1">{formatInline(item.text)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 8. Standard paragraph
    elements.push(
      <p key={`p-${i}`} className="text-xs leading-relaxed text-slate-700 dark:text-zinc-300">
        {formatInline(trimmed)}
      </p>
    );
    i++;
  }

  return <div className="space-y-2">{elements}</div>;
};

/**
 * Parses and renders Markdown tables into clean, responsive glass tables.
 */
function renderTable(key: string, tableLines: string[]): React.ReactNode {
  const parseRow = (line: string): string[] => {
    return line
      .split('|')
      .map((c) => c.trim())
      .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
  };

  const headerLine = tableLines[0];
  const headers = parseRow(headerLine);

  // Skip delimiter row (|---|---|)
  const dataLines = tableLines.slice(1).filter((l) => !l.replace(/[\|\-\:\s]/g, '').length === false || !/^[\|\-\:\s]+$/.test(l));

  const rows = dataLines.map(parseRow);

  return (
    <div key={key} className="my-3 overflow-hidden rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-2xs bg-white/80 dark:bg-zinc-900/70 backdrop-blur-md">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/90 dark:bg-zinc-800/90 border-b border-slate-200/80 dark:border-zinc-700/80">
              {headers.map((h, hIdx) => (
                <th
                  key={hIdx}
                  className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[10px] text-slate-800 dark:text-zinc-200 whitespace-nowrap"
                >
                  {formatInline(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 dark:divide-zinc-800/60">
            {rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors"
              >
                {row.map((cell, cIdx) => (
                  <td
                    key={cIdx}
                    className="px-3.5 py-2.5 text-slate-700 dark:text-zinc-300 font-medium leading-relaxed"
                  >
                    {formatInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Tokenizes and renders bold (**text**), italics (*text*), code (`code`), flow arrows (→, ->), and checkmarks (✅).
 */
function formatInline(text: string): React.ReactNode {
  // Regex to match **bold**, *italic*, `code`, arrows, and checkmarks
  const parts = text.split(/(\*\*.*?\*\*|\*[^*\n]+?\*|`[^`\n]+?`|->|→|✅)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={i} className="font-extrabold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={i} className="italic font-medium text-slate-800 dark:text-zinc-200">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-zinc-800 text-[11px] font-mono font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-zinc-700"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part === '->' || part === '→') {
      return (
        <span key={i} className="inline-flex items-center px-1 font-bold text-indigo-600 dark:text-indigo-400">
          →
        </span>
      );
    }
    if (part === '✅') {
      return (
        <span key={i} className="inline-flex items-center px-1 text-emerald-600 dark:text-emerald-400 font-bold">
          ✓
        </span>
      );
    }
    return part;
  });
}
