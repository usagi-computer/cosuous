import { test, expect } from "vitest";
import { dhtml, hydrate } from "cosuous/hydrate";
import { signal } from "cosuous";

test("hydrate selects root node via id selector", () => {
  document.body.innerHTML = `
    <div id="root">
      <button>something</button>
    </div>
  `;

  const div = hydrate(dhtml`
    <div id="root">
      <button title="Apply pressure">something</button>
    </div>
  `);

  expect(div).toBe(document.querySelector("#root"));

  div.parentNode.removeChild(div);
});

test("hydrate selects root node via class selector", () => {
  document.body.innerHTML = `
    <div class="root pure">
      <button>something</button>
    </div>
  `;

  const div = hydrate(dhtml`
    <div class="root pure">
      <button title="Apply pressure">something</button>
    </div>
  `);

  expect(div).toBe(document.querySelector(".root.pure"));
  expect(div).toBe(document.querySelector(".root"));
  expect(div).toBe(document.querySelector(".pure"));

  div.parentNode.removeChild(div);
});

test("hydrate selects root node via tag selector", () => {
  document.body.innerHTML = `
    <button>something</button>
  `;

  const btn = hydrate(dhtml`
    <button title="Apply pressure">something</button>
  `);

  expect(btn).toBe(document.querySelector("button"));

  btn.parentNode.removeChild(btn);
});

test("hydrate selects root node via partial class selector", () => {
  document.body.innerHTML = `
    <div class="root pure">
      <button>something</button>
    </div>
  `;

  const isActive = signal("");
  const div = hydrate(dhtml`
    <div class="root pure${isActive}">
      <button
        onclick=${() => isActive(isActive() ? "" : " is-active")}
        title="Apply pressure"
      >
        something
      </button>
    </div>
  `);

  const btn = div.children[0];
  btn.click();
  expect(div.className).toBe("root pure is-active");

  expect(div).toBe(document.querySelector(".root.pure"));
  expect(div).toBe(document.querySelector(".root"));
  expect(div).toBe(document.querySelector(".pure"));

  div.parentNode.removeChild(div);
});
