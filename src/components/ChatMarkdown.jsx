import { Sparkles, Check, Droplets, Sun, AlertTriangle, RefreshCw } from "lucide-react";

// A small markdown-lite renderer for Ask SkinScout's AI replies — not a
// general CommonMark parser, just the subset the assistant is asked to use:
// # / ## headings, **bold**, *italic*, "- "/"* " bullets, "1. " numbered
// lists, blank-line paragraph breaks, and a "**Label:** rest of line"
// convention treated as a small section header (see SECTION_LABEL_RE).
// Deliberately builds real React elements (never dangerouslySetInnerHTML)
// so nothing the model returns can inject raw HTML.

const SECTION_LABEL_RE = /^\*\*(.+?)\*\*:?\s*(.*)$/s;
const BOLD_PRODUCT_LABELS = /best match|recommend|conclusion|winner|top pick|alternative/i;
const DISCLAIMER_RE = /medical advice/i;

function iconForLabel(label) {
  const l = label.toLowerCase();
  if (/watch|caution|warning|caveat|note/.test(l)) return AlertTriangle;
  if (/alternative/.test(l)) return RefreshCw;
  if (/ingredient/.test(l)) return Sparkles;
  if (/skin type/.test(l)) return Sun;
  if (/skin|concern/.test(l)) return Droplets;
  if (/why/.test(l)) return Check;
  return Sparkles;
}

// Splits a line of text on **bold** / *italic* spans and returns React nodes.
function renderInline(text, keyPrefix) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter((p) => p !== "");
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function renderLines(lines, keyPrefix) {
  return lines.map((line, i) => (
    <span key={`${keyPrefix}-l${i}`}>
      {renderInline(line, `${keyPrefix}-l${i}`)}
      {i < lines.length - 1 && <br />}
    </span>
  ));
}

function isBulletLine(line) {
  return /^[-*]\s+/.test(line);
}
function isNumberedLine(line) {
  return /^\d+\.\s+/.test(line);
}

function renderBlock(block, index, opts = {}) {
  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  const key = `blk-${index}`;

  const headingMatch = !opts.skipSection && lines[0].match(/^(#{1,2})\s+(.*)$/);
  if (headingMatch) {
    const HeadingTag = headingMatch[1].length === 1 ? "h4" : "h5";
    const rest = lines.slice(1);
    return (
      <div key={key} style={{ margin: "14px 0 8px" }}>
        <HeadingTag className="ss-serif" style={{ fontSize: headingMatch[1].length === 1 ? 16.5 : 15, fontWeight: 600, margin: "0 0 6px", color: "var(--burgundy)" }}>
          {renderInline(headingMatch[2], `${key}-h`)}
        </HeadingTag>
        {rest.length > 0 && renderBlock(rest.join("\n"), `${index}-rest`)}
      </div>
    );
  }

  if (lines.every(isBulletLine)) {
    return (
      <ul key={key} style={{ margin: "6px 0 10px", paddingLeft: 20, lineHeight: 1.65 }}>
        {lines.map((l, i) => (
          <li key={`${key}-i${i}`} style={{ marginBottom: 4 }}>{renderInline(l.replace(/^[-*]\s+/, ""), `${key}-i${i}`)}</li>
        ))}
      </ul>
    );
  }

  if (lines.every(isNumberedLine)) {
    return (
      <ol key={key} style={{ margin: "6px 0 10px", paddingLeft: 20, lineHeight: 1.65 }}>
        {lines.map((l, i) => (
          <li key={`${key}-i${i}`} style={{ marginBottom: 4 }}>{renderInline(l.replace(/^\d+\.\s+/, ""), `${key}-i${i}`)}</li>
        ))}
      </ol>
    );
  }

  const sectionMatch = !opts.skipSection && lines[0].match(SECTION_LABEL_RE);
  if (sectionMatch && sectionMatch[1].length <= 40) {
    const label = sectionMatch[1].replace(/:$/, "");
    let remainderLine = sectionMatch[2].trim();
    if (remainderLine && BOLD_PRODUCT_LABELS.test(label) && !/\*\*/.test(remainderLine)) {
      remainderLine = `**${remainderLine}**`;
    }
    const Icon = iconForLabel(label);
    const bodyLines = [remainderLine, ...lines.slice(1)].filter(Boolean);
    return (
      <div key={key} style={{ margin: "14px 0 6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
          <Icon size={13} color="var(--burgundy)" />
          <span className="ss-eyebrow">{label}</span>
        </div>
        {bodyLines.length > 0 && renderBlock(bodyLines.join("\n"), `${index}-body`, { skipSection: true })}
      </div>
    );
  }

  return (
    <p key={key} style={{ margin: "0 0 12px", lineHeight: 1.7 }}>
      {renderLines(lines, key)}
    </p>
  );
}

export default function ChatMarkdown({ text }) {
  const normalized = (text || "").replace(/\r\n/g, "\n").trim();
  const blocks = normalized.split(/\n\s*\n/).filter((b) => b.trim());

  const disclaimerIndex = blocks.length > 0 && DISCLAIMER_RE.test(blocks[blocks.length - 1]) ? blocks.length - 1 : -1;
  const mainBlocks = disclaimerIndex >= 0 ? blocks.slice(0, disclaimerIndex) : blocks;
  const disclaimerBlock = disclaimerIndex >= 0 ? blocks[disclaimerIndex] : null;

  return (
    <div>
      {mainBlocks.map((block, i) => renderBlock(block, i))}
      {disclaimerBlock && (
        <p style={{ margin: "10px 0 0", paddingTop: 8, borderTop: "1px solid var(--line)", fontSize: 12, fontStyle: "italic", color: "var(--ink-soft)", lineHeight: 1.5 }}>
          {renderLines(disclaimerBlock.split("\n").map((l) => l.trim()).filter(Boolean), "disc")}
        </p>
      )}
    </div>
  );
}
