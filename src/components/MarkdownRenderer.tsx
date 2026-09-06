import React from "react";

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  if (!content) return null;

  // Render paragraphs, headings, bullet lists, bold text and code blocks cleanly
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inList = false;
  let listItems: string[] = [];

  const flushList = (keyPrefix: number) => {
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key={`ul-${keyPrefix}`} className="list-disc list-inside space-y-1 my-2 pl-2 text-[#e1e1e6]">
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const renderInline = (text: string): React.ReactNode => {
    // Process bold **text**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-semibold text-[#c4a67a]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("### ")) {
      flushList(index);
      elements.push(
        <h4 key={index} className="text-sm sm:text-base font-serif italic text-[#c4a67a] mt-3 mb-1">
          {renderInline(trimmed.slice(4))}
        </h4>
      );
    } else if (trimmed.startsWith("## ")) {
      flushList(index);
      elements.push(
        <h3 key={index} className="text-base sm:text-lg font-serif italic text-white mt-4 mb-2">
          {renderInline(trimmed.slice(3))}
        </h3>
      );
    } else if (trimmed.startsWith("# ")) {
      flushList(index);
      elements.push(
        <h2 key={index} className="text-lg sm:text-xl font-serif text-white mt-4 mb-2 tracking-tight">
          {renderInline(trimmed.slice(2))}
        </h2>
      );
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      inList = true;
      listItems.push(trimmed.slice(2));
    } else if (/^\d+\.\s/.test(trimmed)) {
      flushList(index);
      const match = trimmed.match(/^\d+\.\s(.*)/);
      const itemContent = match ? match[1] : trimmed;
      elements.push(
        <div key={index} className="flex gap-2 my-1 pl-1 text-[#e1e1e6] leading-relaxed">
          <span className="font-semibold text-[#c4a67a] min-w-[20px]">{trimmed.split(" ")[0]}</span>
          <div>{renderInline(itemContent)}</div>
        </div>
      );
    } else if (trimmed === "") {
      flushList(index);
      // Empty line spacer
    } else {
      flushList(index);
      elements.push(
        <p key={index} className="my-2 leading-relaxed text-[#d4d4d8]">
          {renderInline(trimmed)}
        </p>
      );
    }
  });

  flushList(lines.length);

  return <div className="space-y-1 text-sm md:text-base">{elements}</div>;
};
