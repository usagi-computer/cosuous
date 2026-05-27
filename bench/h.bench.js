import { bench, describe } from "vitest";
import { h, html, signal } from "cosuous";

describe("h() creation", () => {
  bench("empty div", () => {
    h("div");
  });
  bench("div with static text", () => {
    h("div", null, "hello");
  });
  bench("div with class + id", () => {
    h("div", { class: "foo", id: "bar" }, "hi");
  });
  bench("nested 3 deep", () => {
    h("section", null, h("article", null, h("p", null, "leaf")));
  });
  bench("list of 10 children", () => {
    h("ul", null, ...Array.from({ length: 10 }, (_, i) => h("li", null, "item " + i)));
  });
});

describe("html`` tagged template", () => {
  bench("simple div", () => {
    html`<div>hi</div>`;
  });
  bench("with interpolation", () => {
    const label = "tag";
    html`<span class=${label}>x</span>`;
  });
});

describe("reactive attribute", () => {
  bench("signal-bound text", () => {
    const s = signal("a");
    const el = html`<div>${s}</div>`;
    s("b");
    void el;
  });
});
