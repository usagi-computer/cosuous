import { test, expect } from "vitest";
import { effectScope, signal } from "cosuous/observable";
import { html } from "cosuous";
import { map } from "cosuous/map";

function divs(str) {
  return "<div>" + str.split(",").join("</div><div>") + "</div>";
}

const one = { text: signal(1) };
const two = { text: signal(2) };
const three = { text: signal(3) };
const four = { text: signal(4) };
const five = { text: signal(5) };
const list = signal([one, two, three, four, five]);

const div = document.createElement("div");
const dispose = effectScope(() => {
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
