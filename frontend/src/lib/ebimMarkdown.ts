function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(raw: string, resolveHref: (href: string) => string | null): string {
  let text = escapeHtml(raw);
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_all, label: string, href: string) => {
    const decoded = href.replace(/&amp;/g, "&");
    if (/^https?:\/\//i.test(decoded)) {
      return `<a href="${escapeHtml(decoded)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    }
    const section = resolveHref(decoded.split("#")[0] || decoded);
    if (section) {
      return `<a href="#ebim-${section}" data-ebim-jump="${section}">${label}</a>`;
    }
    return label;
  });
  return text;
}

function isTableSep(line: string): boolean {
  const cells = line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|");
  return cells.length > 0 && cells.every((cell) => /^\s*:?-{3,}:?\s*$/.test(cell));
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

/** Renders the study notes. HTML in the source is escaped. Relative notes become in-reader jumps. */
export function renderStudyMarkdown(
  markdown: string,
  resolveHref: (href: string) => string | null,
): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];
  let i = 0;

  const pushParagraph = (buf: string[]) => {
    const text = buf.join(" ").trim();
    if (text) blocks.push(`<p>${inline(text, resolveHref)}</p>`);
  };

  while (i < lines.length) {
    const line = lines[i];
    const fence = /^```(.*)$/.exec(line);
    if (fence) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        body.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push(`<pre class="ebim-code"><code>${escapeHtml(body.join("\n"))}</code></pre>`);
      continue;
    }

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      const level = Math.min(heading[1].length + 1, 6);
      blocks.push(`<h${level}>${inline(heading[2], resolveHref)}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      blocks.push("<hr />");
      i += 1;
      continue;
    }

    if (line.trim().startsWith("|") && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      const head = header.map((cell) => `<th>${inline(cell, resolveHref)}</th>`).join("");
      const body = rows
        .map((row) => `<tr>${row.map((cell) => `<td>${inline(cell, resolveHref)}</td>`).join("")}</tr>`)
        .join("");
      blocks.push(`<div class="ebim-table"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`);
      continue;
    }

    if (/^[-*]\s+/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i += 1;
      }
      blocks.push(`<ul>${items.map((item) => `<li>${inline(item, resolveHref)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push(`<ol>${items.map((item) => `<li>${inline(item, resolveHref)}</li>`).join("")}</ol>`);
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("```") &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^---+$/.test(lines[i].trim()) &&
      !(lines[i].trim().startsWith("|") && i + 1 < lines.length && isTableSep(lines[i + 1])) &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim())
    ) {
      para.push(lines[i].trim());
      i += 1;
    }
    pushParagraph(para);
  }

  return blocks.join("\n");
}

export function renderPlainText(source: string): string {
  return `<pre class="ebim-code"><code>${escapeHtml(source)}</code></pre>`;
}
