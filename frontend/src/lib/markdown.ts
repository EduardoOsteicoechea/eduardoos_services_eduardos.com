const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

function safeHttpURL(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

function renderInline(text: string, parent: HTMLElement): void {
  let last = 0;
  const re = new RegExp(INLINE.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (match.index > last) {
      parent.append(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      const el = document.createElement("strong");
      el.textContent = token.slice(2, -2);
      parent.append(el);
    } else if (token.startsWith("*")) {
      const el = document.createElement("em");
      el.textContent = token.slice(1, -1);
      parent.append(el);
    } else if (token.startsWith("`")) {
      const el = document.createElement("code");
      el.textContent = token.slice(1, -1);
      parent.append(el);
    } else if (token.startsWith("[")) {
      const close = token.indexOf("]");
      const href = token.slice(close + 2, -1);
      const safe = safeHttpURL(href);
      if (safe) {
        const a = document.createElement("a");
        a.href = safe;
        a.rel = "noopener noreferrer";
        a.target = "_blank";
        a.textContent = token.slice(1, close);
        parent.append(a);
      } else {
        parent.append(token);
      }
    }
    last = match.index + token.length;
  }
  if (last < text.length) {
    parent.append(text.slice(last));
  }
}

export function renderMarkdown(text: string, root: HTMLElement): void {
  root.replaceChildren();
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const code = document.createElement("pre");
      const inner = document.createElement("code");
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        buf.push(lines[i]);
        i += 1;
      }
      inner.textContent = buf.join("\n");
      code.append(inner);
      root.append(code);
      i += 1;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const list = document.createElement("ul");
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const li = document.createElement("li");
        renderInline(lines[i].replace(/^\s*[-*]\s+/, ""), li);
        list.append(li);
        i += 1;
      }
      root.append(list);
      continue;
    }
    if (line.trim() === "") {
      i += 1;
      continue;
    }
    const p = document.createElement("p");
    renderInline(line, p);
    root.append(p);
    i += 1;
  }
}
