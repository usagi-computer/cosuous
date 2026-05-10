import { test, expect } from "vitest";
import { signal as o, h, html } from "cosuous";
import { insert } from "../../src/h.js";

const insertValue = (val) => {
  const parent = container.cloneNode(true);
  insert(parent, val);
  return parent;
};

// insert
// <div>before<!-- insert -->after</div>
const container = document.createElement("div");

test("inserts observable into simple text", () => {
  let scratch = h("div");
  h(document.body, scratch);

  const counter = o(0);
  scratch.appendChild(html`Here's a list of items: Count: ${counter}`);
  expect(scratch.innerHTML).toBe(`Here's a list of items: Count: 0`);

  counter(counter() + 1);
  expect(scratch.innerHTML).toBe(`Here's a list of items: Count: 1`);
});

test("inserts fragments", () => {
  const frag = o(html`
    <h1>Hello world</h1>
    <p>Bye bye</p>
  `);
  const res = html`<div>${frag}</div>`;
  expect(res.innerHTML).toBe("<h1>Hello world</h1><p>Bye bye</p>");
  expect(res.children.length).toBe(2);

  frag(html`
    <h1>Cool</h1>
    <p>Beans</p>
  `);
  expect(res.innerHTML).toBe("<h1>Cool</h1><p>Beans</p>");
  expect(res.children.length).toBe(2);

  frag("make it a string");
  expect(res.innerHTML).toBe("make it a string");
  expect(res.childNodes.length).toBe(4);

  frag(html`
    <h1>Cool</h1>
    <p>Beans</p>
  `);
  expect(res.innerHTML).toBe("<h1>Cool</h1><p>Beans</p>");
  expect(res.children.length).toBe(2);
});

test("inserts long fragments", () => {
  const frag = o(html`
    <h1>Hello world</h1>
    <p>Bye bye</p>
    <p>Hello again</p>
  `);
  const res = html`<div>${frag}</div>`;
  expect(res.innerHTML).toBe("<h1>Hello world</h1><p>Bye bye</p><p>Hello again</p>");
  expect(res.children.length).toBe(3);

  frag(html`
    <p>Hello again</p>
    <p>Bye bye</p>
    <h1>Hello world</h1>
  `);
  expect(res.innerHTML).toBe("<p>Hello again</p><p>Bye bye</p><h1>Hello world</h1>");
  expect(res.children.length).toBe(3);
});

test("inserts nothing for null", () => {
  const res = insertValue(null);
  expect(res.innerHTML).toBe("");
  expect(res.childNodes.length).toBe(0);
});

test("inserts nothing for undefined", () => {
  const res = insertValue(undefined);
  expect(res.innerHTML).toBe("");
  expect(res.childNodes.length).toBe(0);
});

test("inserts nothing for false", () => {
  const res = insertValue(false);
  expect(res.innerHTML).toBe("");
  expect(res.childNodes.length).toBe(0);
});

test("inserts nothing for true", () => {
  const res = insertValue(true);
  expect(res.innerHTML).toBe("");
  expect(res.childNodes.length).toBe(0);
});

test("inserts nothing for null in array", () => {
  const res = insertValue(["a", null, "b"]);
  expect(res.innerHTML).toBe("ab");
  expect(res.childNodes.length).toBe(3);
});

test("inserts nothing for undefined in array", () => {
  const res = insertValue(["a", undefined, "b"]);
  expect(res.innerHTML).toBe("ab");
  expect(res.childNodes.length).toBe(3);
});

test("can insert stringable", () => {
  let res = insertValue("foo");
  expect(res.innerHTML).toBe("foo");
  expect(res.childNodes.length).toBe(1);

  res = insertValue(11206);
  expect(res.innerHTML).toBe("11206");
  expect(res.childNodes.length).toBe(1);
});

test("can insert a node", () => {
  const node = document.createElement("span");
  node.textContent = "foo";
  expect(insertValue(node).innerHTML).toBe("<span>foo</span>");
});

test("can re-insert a node, thereby moving it", () => {
  const node = document.createElement("span");
  node.textContent = "foo";

  const first = insertValue(node),
    second = insertValue(node);

  expect(first.innerHTML).toBe("");
  expect(second.innerHTML).toBe("<span>foo</span>");
});

test("can insert an array of strings", () => {
  expect(insertValue(["foo", "bar"]).innerHTML).toBe("foobar");
});

test("can insert an array of nodes", () => {
  const nodes = [document.createElement("span"), document.createElement("div")];
  nodes[0].textContent = "foo";
  nodes[1].textContent = "bar";
  expect(insertValue(nodes).innerHTML).toBe("<span>foo</span><div>bar</div>");
});

test("can insert a changing array of nodes 1", () => {
  var parent = document.createElement("div"),
    current = "",
    n1 = document.createElement("span"),
    n2 = document.createElement("div"),
    n3 = document.createElement("span"),
    n4 = document.createElement("div"),
    orig = [n1, n2, n3, n4];

  n1.textContent = "1";
  n2.textContent = "2";
  n3.textContent = "3";
  n4.textContent = "4";

  var origExpected = expected(orig);

  // identity
  test([n1, n2, n3, n4]);

  // 1 missing
  test([n2, n3, n4]);
  test([n1, n3, n4]);
  test([n1, n2, n4]);
  test([n1, n2, n3]);

  // 2 missing
  test([n3, n4]);
  test([n2, n4]);
  test([n2, n3]);
  test([n1, n4]);
  test([n1, n3]);
  test([n1, n2]);

  // 3 missing
  test([n1]);
  test([n2]);
  test([n3]);
  test([n4]);

  // all missing
  test([]);

  // swaps
  test([n2, n1, n3, n4]);
  test([n3, n2, n1, n4]);
  test([n4, n2, n3, n1]);

  // rotations
  test([n2, n3, n4, n1]);
  test([n3, n4, n1, n2]);
  test([n4, n1, n2, n3]);

  // reversal
  test([n4, n3, n2, n1]);

  function test(array) {
    current = insert(parent, array, undefined, current);
    expect(parent.innerHTML).toBe(expected(array));
    current = insert(parent, orig, undefined, current);
    expect(parent.innerHTML).toBe(origExpected);
  }

  function expected(array) {
    return array.map((n) => n.outerHTML).join("");
  }
});

test("can insert nested arrays", () => {
  let current = insertValue(["foo", ["bar", "blech"]]);
  expect(current.innerHTML).toBe("foobarblech");
});

test("can update text with node", () => {
  const parent = container.cloneNode(true);

  let current = insert(parent, "🧬");
  expect(parent.innerHTML).toBe("🧬");

  insert(parent, h("h1", "⛄️"), undefined, current);
  expect(parent.innerHTML).toBe("<h1>⛄️</h1>");
});

test("can update content with text with marker", () => {
  const parent = container.cloneNode(true);
  const marker = parent.appendChild(document.createTextNode(""));

  let current = insert(parent, h("h1", "⛄️"), marker);
  expect(parent.innerHTML).toBe("<h1>⛄️</h1>");

  insert(parent, "⛄️", marker, current);
  expect(parent.innerHTML).toBe("⛄️");
});

test("can update content with text and observable with marker", () => {
  const parent = container.cloneNode(true);
  const marker = parent.appendChild(document.createTextNode(""));

  const reactive = o("reactive");
  const dynamic = o(99);

  insert(parent, h("h1", reactive, "⛄️", dynamic), marker);
  expect(parent.innerHTML).toBe("<h1>reactive⛄️99</h1>");

  dynamic(77);
  expect(parent.innerHTML).toBe("<h1>reactive⛄️77</h1>");

  reactive(1);
  expect(parent.innerHTML).toBe("<h1>1⛄️77</h1>");

  dynamic("");
  expect(parent.innerHTML).toBe("<h1>1⛄️</h1>");

  reactive("");
  expect(parent.innerHTML).toBe("<h1>⛄️</h1>");

  insert(parent, "⛄️", marker, parent.children[0]);
  expect(parent.innerHTML).toBe("⛄️");
});
