import { test, expect } from "vitest";
import * as api from "cosuous/observable";
import { o, h } from "cosuous";
import { map } from "cosuous/map";

const root = api.root;

let div;
const n1 = "a",
  n2 = "b",
  n3 = "c",
  n4 = "d";
const list = o([n1, n2, n3, n4]);
let dispose;
const Component = () =>
  root((d) => {
    dispose = d;
    div = h(
      "div",
      map(list, (item) => h([item, item])),
    );
  });

function apply(array) {
  list(array);
  expect(div.innerHTML).toBe(array.map((p) => `${p}${p}`).join(""));
  list([n1, n2, n3, n4]);
  expect(div.innerHTML).toBe("aabbccdd");
}

test("Create map control flow", () => {
  Component();

  expect(div.innerHTML).toBe("aabbccdd");
});

test("1 missing", () => {
  apply([n2, n3, n4]);
  apply([n1, n3, n4]);
  apply([n1, n2, n4]);
  apply([n1, n2, n3]);
});

test("2 missing", () => {
  apply([n3, n4]);
  apply([n2, n4]);
  apply([n2, n3]);
  apply([n1, n4]);
  apply([n1, n3]);
  apply([n1, n2]);
});

test("3 missing", () => {
  apply([n1]);
  apply([n2]);
  apply([n3]);
  apply([n4]);
});

test("all missing", () => {
  apply([]);
});

test("swaps", () => {
  apply([n2, n1, n3, n4]);
  apply([n3, n2, n1, n4]);
  apply([n4, n2, n3, n1]);
});

test("rotations", () => {
  apply([n2, n3, n4, n1]);
  apply([n3, n4, n1, n2]);
  apply([n4, n1, n2, n3]);
});

test("reversal", () => {
  apply([n4, n3, n2, n1]);
});

test("full replace", () => {
  apply(["e", "f", "g", "h"]);
});

test("swap backward edge", () => {
  list(["milk", "bread", "chips", "cookie", "honey"]);
  list(["chips", "bread", "cookie", "milk", "honey"]);
});

test("dispose", () => {
  dispose();
});
