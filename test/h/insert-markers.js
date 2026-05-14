import { expect, test } from "vitest";

import { insert } from "../../src/h.js";

// insert with Markers
// <div>before<!-- insert -->after</div>

function insertValue(val) {
  const parent = clone(container);
  insert(parent, val, parent.childNodes[1]);
  return parent;
}

// IE doesn't clone empty text nodes
function clone(el) {
  const cloned = el.cloneNode(true);
  cloned.textContent = "";
  [].slice.call(el.childNodes).forEach((n) => cloned.appendChild(n.cloneNode()));
  return cloned;
}

const container = document.createElement("div");
container.appendChild(document.createTextNode("before"));
container.appendChild(document.createTextNode(""));
container.appendChild(document.createTextNode("after"));

test("inserts nothing for null", () => {
  const res = insertValue(null);
  expect(res.innerHTML).toBe("beforeafter");
  expect(res.childNodes.length).toBe(3);
});

test("inserts nothing for undefined", () => {
  const res = insertValue(undefined);
  expect(res.innerHTML).toBe("beforeafter");
  expect(res.childNodes.length).toBe(3);
});

test("inserts nothing for false", () => {
  const res = insertValue(false);
  expect(res.innerHTML).toBe("beforeafter");
  expect(res.childNodes.length).toBe(3);
});

test("inserts nothing for true", () => {
  const res = insertValue(true);
  expect(res.innerHTML).toBe("beforeafter");
  expect(res.childNodes.length).toBe(3);
});

test("inserts nothing for null in array", () => {
  const res = insertValue(["a", null, "b"]);
  expect(res.innerHTML).toBe("beforeabafter");
  expect(res.childNodes.length).toBe(6);
});

test("inserts nothing for undefined in array", () => {
  const res = insertValue(["a", undefined, "b"]);
  expect(res.innerHTML).toBe("beforeabafter");
  expect(res.childNodes.length).toBe(6);
});

test("can insert strings", () => {
  let res = insertValue("foo");
  expect(res.innerHTML).toBe("beforefooafter");
  expect(res.childNodes.length).toBe(4);

  res = insertValue("");
  expect(res.innerHTML).toBe("beforeafter");
});

test("can insert a node", () => {
  const node = document.createElement("span");
  node.textContent = "foo";
  expect(insertValue(node).innerHTML).toBe("before<span>foo</span>after");
});

test("can re-insert a node, thereby moving it", () => {
  var node = document.createElement("span");
  node.textContent = "foo";

  const first = insertValue(node),
    second = insertValue(node);

  expect(first.innerHTML).toBe("beforeafter");
  expect(second.innerHTML).toBe("before<span>foo</span>after");
});

test("can insert an array of strings", () => {
  expect(insertValue(["foo", "bar"]).innerHTML).toBe("beforefoobarafter");
});

test("can insert an array of nodes", () => {
  const nodes = [document.createElement("span"), document.createElement("div")];
  nodes[0].textContent = "foo";
  nodes[1].textContent = "bar";
  expect(insertValue(nodes).innerHTML).toBe("before<span>foo</span><div>bar</div>after");
});

test("can insert a changing array of nodes", () => {
  let container = document.createElement("div"),
    marker = container.appendChild(document.createTextNode("")),
    span1 = document.createElement("span"),
    div2 = document.createElement("div"),
    span3 = document.createElement("span"),
    current;
  span1.textContent = "1";
  div2.textContent = "2";
  span3.textContent = "3";

  current = insert(container, [], marker, current);
  expect(container.innerHTML).toBe("");

  current = insert(container, [span1, div2, span3], marker, current);
  expect(container.innerHTML).toBe("<span>1</span><div>2</div><span>3</span>");

  current = insert(container, [div2, span3], marker, current);
  expect(container.innerHTML).toBe("<div>2</div><span>3</span>");

  current = insert(container, [div2, span3], marker, current);
  expect(container.innerHTML).toBe("<div>2</div><span>3</span>");

  current = insert(container, [span3, div2], marker, current);
  expect(container.innerHTML).toBe("<span>3</span><div>2</div>");

  current = insert(container, [], marker, current);
  expect(container.innerHTML).toBe("");

  current = insert(container, [span3], marker, current);
  expect(container.innerHTML).toBe("<span>3</span>");

  current = insert(container, [div2], marker, current);
  expect(container.innerHTML).toBe("<div>2</div>");
});

test("can insert nested arrays", () => {
  expect(insertValue(["foo", ["bar", "blech"]]).innerHTML).toBe("beforefoobarblechafter");
});
