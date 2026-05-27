// Smoke test for the built dist/ artifacts. Runs under plain Node, no
// vitest/JSDOM. Verifies signals work and that the entry re-export wiring
// (chunks/) resolves cleanly. DOM-touching exports aren't exercised here.
import assert from "node:assert/strict";

import { signal as signalFromIndex } from "../dist/index.js";
import { batch, computed, effect, signal } from "../dist/signal.js";

const count = signal(0);
assert.equal(count(), 0, "signal reads initial value");
count(1);
assert.equal(count(), 1, "signal updates");

assert.equal(signalFromIndex === signal, true, "index re-export matches signal entry");

const doubled = computed(() => count() * 2);
assert.equal(doubled(), 2, "computed derives from signal");
count(3);
assert.equal(doubled(), 6, "computed updates on dependency change");

let runs = 0;
let last;
const stop = effect(() => {
  runs++;
  last = count();
});
assert.equal(runs, 1, "effect runs once on registration");
assert.equal(last, 3, "effect sees current value");

count(10);
assert.equal(runs, 2, "effect re-runs on dependency change");
assert.equal(last, 10);

batch(() => {
  count(20);
  count(30);
});
assert.equal(runs, 3, "batch coalesces updates into single re-run");
assert.equal(last, 30);

stop();
count(99);
assert.equal(runs, 3, "stopped effect does not re-run");

console.log("dist/ smoke test passed");
