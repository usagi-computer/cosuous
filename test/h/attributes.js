import { test, expect } from "vitest";
import { html } from "cosuous";

test("label sets for attribute", () => {
  const label = html`<label for="my-input">My Label</label>`;
  expect(label.outerHTML).toBe('<label for="my-input">My Label</label>');
});

test("element calls onMount when inserted", () => {
  let called = false;
  const onMount = () => {
    called = true;
  };

  const div = html`<div onMount=${onMount}>Hello</div>`;
  document.body.appendChild(div);

  setTimeout(() => {
    expect(called).toBeTruthy();
  }, 40); // allow requestAnimationFrame to run
});

test("element calls onUnmount when removed", () => {
  let called = false;
  const onUnmount = () => {
    called = true;
  };

  const div = html`<div onUnmount=${onUnmount}>Hello</div>`;
  document.body.appendChild(div);

  setTimeout(() => {
    document.body.removeChild(div);
    setTimeout(() => {
      expect(called).toBeTruthy();
    }, 40); // allow MutationObserver to run
  }, 40);
});
