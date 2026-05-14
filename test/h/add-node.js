import { test, expect } from "vitest";
import { h } from "cosuous";
import { add as addNode } from "../../src/h.js";

test("addNode inserts fragment", () => {
  const parent = document.createElement("div");
  parent.appendChild(document.createTextNode("test"));

  const fragment = document.createDocumentFragment();
  fragment.appendChild(h("h1"));
  addNode(parent, fragment);

  expect(parent.innerHTML).toBe("test<h1></h1>");
});

test("addNode inserts fragment w/ marker", () => {
  const parent = document.createElement("div");
  parent.appendChild(document.createTextNode("test"));

  const marker = parent.appendChild(document.createElement("span"));
  const fragment = document.createDocumentFragment();
  fragment.appendChild(h("h1"));
  fragment.appendChild(h("h2"));
  addNode(parent, fragment, marker);

  expect(parent.innerHTML).toBe("test<h1></h1><h2></h2><span></span>");
});

test("addNode inserts strings", () => {
  const parent = document.createElement("div");
  addNode(parent, "⛄");
  expect(parent.innerHTML).toBe("⛄");
});

test("addNode inserts numbers", () => {
  const parent = document.createElement("div");
  addNode(parent, 99);
  expect(parent.innerHTML).toBe("99");
});

test("addNode inserts nodes", () => {
  const parent = document.createElement("div");
  const node = document.createElement("div");
  expect(addNode(parent, node)).toBe(node);
});
