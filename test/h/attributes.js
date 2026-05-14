import { test, expect, vi } from "vitest";
import { html } from "cosuous";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test("label sets for attribute", () => {
  const label = html`<label for="my-input">My Label</label>`;
  expect(label.outerHTML).toBe('<label for="my-input">My Label</label>');
});

test("element calls onMount when inserted", async () => {
  const onMount = vi.fn();
  const div = html`<div onMount=${onMount}>Hello</div>`;
  document.body.appendChild(div);

  // onMount fires inside requestAnimationFrame.
  await wait(40);
  expect(onMount).toHaveBeenCalledOnce();
});

test("element calls onUnmount when removed", async () => {
  const onUnmount = vi.fn();
  const div = html`<div onUnmount=${onUnmount}>Hello</div>`;
  document.body.appendChild(div);
  document.body.removeChild(div);

  // onUnmount fires inside a MutationObserver callback (microtask).
  await wait(40);
  expect(onUnmount).toHaveBeenCalledOnce();
});
