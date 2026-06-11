import { describe, it, expect, vi, beforeAll } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

beforeAll(() => {
  globalThis.window = globalThis.window || {};
  globalThis.window.storage = { get: () => Promise.reject(), set: () => Promise.resolve(), delete: () => Promise.resolve(), list: () => Promise.resolve({ keys: [] }) };
  globalThis.window.addEventListener = globalThis.window.addEventListener || (() => {});
  globalThis.window.removeEventListener = globalThis.window.removeEventListener || (() => {});
});

describe("smoke: la app renderiza en estado inicial (sin muros)", () => {
  it("no lanza al renderizar", async () => {
    const mod = await import("../PanelizadorSF.jsx");
    const App = mod.default;
    const html = renderToString(React.createElement(App));
    expect(html).toContain("Panelizador");
  });
});
