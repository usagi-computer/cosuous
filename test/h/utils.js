import { test, expect } from "vitest";
import { removeNodes } from "../../src/h.js";

test("removeNodes", () => {
  const parent = document.createElement("div");
  let first = parent.appendChild(document.createComment(""));
  parent.appendChild(document.createElement("span"));
  let endMark = parent.appendChild(document.createTextNode(""));

  removeNodes(parent, first, endMark);

  expect(parent.innerHTML).toBe("");
  expect(parent.childNodes.length).toBe(1);
});
