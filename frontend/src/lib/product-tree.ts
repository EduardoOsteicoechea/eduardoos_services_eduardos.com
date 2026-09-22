/**
 * Shared product tree chrome helpers (Homescool, Calvin Institutes).
 */

export function productTreeChevron(): HTMLSpanElement {
  const icon = document.createElement("span");
  icon.className = "material-symbols-outlined product-tree__chevron";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "chevron_right";
  return icon;
}

export function productTreeLeafIcon(name = "description"): HTMLSpanElement {
  const icon = document.createElement("span");
  icon.className = "material-symbols-outlined product-tree__leaf-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = name;
  return icon;
}

export function productTreeLabel(text: string): HTMLSpanElement {
  const label = document.createElement("span");
  label.className = "product-tree__label";
  label.textContent = text;
  return label;
}
