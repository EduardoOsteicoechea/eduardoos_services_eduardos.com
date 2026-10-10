/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startClientRouting } from "./router";

function dispatchBeforePreparation(init: {
  from: string;
  to: string;
  navigationType: string;
}): Event {
  const event = new Event("astro:before-preparation", { cancelable: true, bubbles: true });
  Object.assign(event, {
    from: new URL(init.from, "http://localhost"),
    to: new URL(init.to, "http://localhost"),
    navigationType: init.navigationType,
  });
  document.dispatchEvent(event);
  return event;
}

describe("startClientRouting astro:before-preparation", () => {
  const reload = vi.fn();
  const assign = vi.fn();

  beforeEach(() => {
    window.__clientRoutingStarted = false;
    reload.mockReset();
    assign.mockReset();
    vi.stubGlobal("location", {
      href: "http://localhost/about",
      origin: "http://localhost",
      pathname: "/about",
      search: "",
      hash: "",
      assign,
      reload,
      replace: vi.fn(),
    });
    startClientRouting();
  });

  afterEach(() => {
    window.__clientRoutingStarted = false;
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("traverse with different path: preventDefault only, no reload", () => {
    const event = dispatchBeforePreparation({
      from: "http://localhost/about",
      to: "http://localhost/contact",
      navigationType: "traverse",
    });

    expect(event.defaultPrevented).toBe(true);
    expect(reload).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it("pamphlet full-doc nav: preventDefault only, no assign or reload", () => {
    const event = dispatchBeforePreparation({
      from: "http://localhost/about",
      to: "http://localhost/documents/pamphlet",
      navigationType: "goto",
    });

    expect(event.defaultPrevented).toBe(true);
    expect(reload).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it("pamphlet from-path: preventDefault only, no assign or reload", () => {
    const event = dispatchBeforePreparation({
      from: "http://localhost/documents/pamphlet/open",
      to: "http://localhost/about",
      navigationType: "traverse",
    });

    expect(event.defaultPrevented).toBe(true);
    expect(reload).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });
});
