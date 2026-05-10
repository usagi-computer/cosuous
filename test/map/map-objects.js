import { test, expect } from "vitest";
import * as api from "cosuous/observable";
import { o, h, html } from "cosuous";
import { map } from "cosuous/map";

const root = api.root;

function divs(str) {
  return "<div>" + str.split(",").join("</div><div>") + "</div>";
}

const one = { text: o(1) };
const two = { text: o(2) };
const three = { text: o(3) };
const four = { text: o(4) };
const five = { text: o(5) };
const list = o([one, two, three, four, five]);

const div = document.createElement("div");
let dispose;
root((d) => {
  dispose = d;
  div.appendChild(map(list, (item) => html`<div>${item.text}</div>`));
});

test("Object reference - create", () => {
  expect(div.innerHTML).toBe(divs("1,2,3,4,5"));
});

test("Object reference - update", () => {
  list([three, one, four, two]);
  expect(div.innerHTML).toBe(divs("3,1,4,2"));
});

test("Object reference - update 2", () => {
  list([one, three, two, four]);
  expect(div.innerHTML).toBe(divs("1,3,2,4"));
});

test("Object reference - update 3", () => {
  list([five, three, four]);
  expect(div.innerHTML).toBe(divs("5,3,4"));
});

test("Object reference - clear", () => {
  list([]);
  expect(div.innerHTML).toBe("");
});

test("Object reference - dispose", () => {
  dispose();
});
