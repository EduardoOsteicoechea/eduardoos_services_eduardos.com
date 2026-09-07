import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
  it("renders bold and keeps raw HTML as text", () => {
    const root = document.createElement("div");
    renderMarkdown("Visit **turquesa.shop** and <img src=x onerror=alert(1)>", root);
    expect(root.querySelector("strong")?.textContent).toBe("turquesa.shop");
    expect(root.querySelector("img")).toBeNull();
    expect(root.textContent).toContain("<img src=x onerror=alert(1)>");
  });
});
