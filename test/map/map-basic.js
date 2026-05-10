import { test, expect } from "vitest";
import { root } from "cosuous/observable";
import { o, h, html } from "cosuous";
import { map } from "cosuous/map";

const list = o([]);
const show = o(true);
const fallback = o(
  html`<ul>
    <li></li>
  </ul>`,
);

let div;
let dispose;
root((d) => {
  dispose = d;
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

test("Basic map - dispose", () => {
  dispose();
});
