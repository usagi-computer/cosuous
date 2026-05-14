import { test, expect, afterAll } from "vitest";
import { effectScope, signal } from "cosuous/signal";
import { h, html } from "cosuous";
import { map } from "cosuous/map";

const list = signal([]);
const show = signal(true);
const fallback = signal(
  html`<ul>
    <li></li>
  </ul>`,
);

let div;
const dispose = effectScope(() => {
  div = html`
    <div>${() => (show() ? html`${map(list, (item) => html`${item}`)}` : html`${fallback}`)}</div>
  `;
});

test("Basic map - create", () => {
  list([
    ["a", 1],
    ["b", 2],
    ["c", 3],
    ["d", 4],
  ]);
  expect(div.innerHTML).toBe("a1b2c3d4");
});

test("Basic map - update", () => {
  list([["b", 2, 99], ["a", 1], ["c"]]);
  expect(div.innerHTML).toBe("b299a1c");
});

test("Basic map - clear", () => {
  list([]);
  expect(div.innerHTML).toBe("");
});

test("Basic map - update 2", () => {
  show(false);
  list([["b", 2, 99], ["a", 1], ["c"]]);
  expect(div.innerHTML).toBe("<ul><li></li></ul>");
});

test("Basic map - clear 2", () => {
  show(true);
  list([]);
  fallback("");
  expect(div.innerHTML).toBe("");
});

test("Basic map - update 3", () => {
  div.insertBefore(h("i"), div.firstChild);
  div.insertBefore(h("b"), div.firstChild);

  div.appendChild(h("i"));
  div.appendChild(h("b"));

  list([["b", 2, 99], ["a", 1], ["c"]]);
  expect(div.innerHTML).toBe("<b></b><i></i>b299a1c<i></i><b></b>");
});

test("Basic map - update 4", () => {
  list([]);
  show(false);
  fallback(
    html`<ul>
      <li></li>
    </ul>`,
  );
  expect(div.innerHTML).toBe("<b></b><i></i><ul><li></li></ul><i></i><b></b>");
});

test("Basic map - update 5", () => {
  show(true);
  fallback(11);
  expect(div.innerHTML).toBe("<b></b><i></i><i></i><b></b>");
});

afterAll(() => {
  dispose();
});

// Regression for sinuous#239: when a list shrinks so that the surviving item
// lands at index 0 of the new list, the truthiness check on the position-map
// lookup used to misclassify it as "not reused", destroying and recreating
// the DOM node. The surviving node should keep its identity.
test("sinuous#239 - shrinking list preserves index-0 reused node identity", () => {
  const items = signal(["foo", "BAR", "baz"]);
  let host;
  const dispose239 = effectScope(() => {
    host = h(
      "div",
      map(items, (item) => h("span", item)),
    );
  });

  expect(host.innerHTML).toBe("<span>foo</span><span>BAR</span><span>baz</span>");
  const barNode = host.querySelectorAll("span")[1];

  items(["BAR"]);
  expect(host.innerHTML).toBe("<span>BAR</span>");
  expect(host.querySelector("span")).toBe(barNode);

  dispose239();
});
