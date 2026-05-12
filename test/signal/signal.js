import { test, expect, vi } from "vitest";
import {
  batch,
  computed,
  effect,
  effectScope,
  endBatch,
  isComputed,
  isSignal,
  signal,
  startBatch,
  untracked,
} from "cosuous/signal";

test("signal initial value", () => {
  const s = signal("Groovy!");
  expect(s()).toBe("Groovy!");
});

test("signal can be set without an effect", () => {
  const s = signal();
  s("Groovy!");
  expect(s()).toBe("Groovy!");
});

test("effect runs eagerly and re-runs on signal change", () => {
  const s = signal(0);
  const seen = [];
  effect(() => seen.push(s()));
  expect(seen).toEqual([0]);
  s(1);
  expect(seen).toEqual([0, 1]);
});

test("computed is lazy and re-derives on read after dep change", () => {
  const a = signal(2);
  const sq = computed(() => a() * a());
  expect(sq()).toBe(4);
  a(3);
  expect(sq()).toBe(9);
});

test("effect dispose stops further runs", () => {
  const s = signal(0);
  const seen = [];
  const stop = effect(() => seen.push(s()));
  s(1);
  stop();
  s(2);
  expect(seen).toEqual([0, 1]);
});

test("untracked reads do not register dependencies", () => {
  const a = signal(1);
  const b = signal(10);
  let runs = 0;
  effect(() => {
    runs++;
    a();
    untracked(() => b());
  });
  expect(runs).toBe(1);
  b(20);
  expect(runs).toBe(1);
  a(2);
  expect(runs).toBe(2);
});

test("startBatch/endBatch coalesces updates", () => {
  const a = signal(1);
  const b = signal(2);
  const seen = [];
  effect(() => seen.push(a() + b()));
  expect(seen).toEqual([3]);
  startBatch();
  a(10);
  b(20);
  endBatch();
  expect(seen).toEqual([3, 30]);
});

test("returned cleanup runs before each effect re-run and on dispose", () => {
  const s = signal(0);
  const cleanups = [];
  const stop = effect(() => {
    const v = s();
    return () => cleanups.push(v);
  });
  s(1);
  s(2);
  stop();
  expect(cleanups).toEqual([0, 1, 2]);
});

test("batch(fn) coalesces updates and returns fn's value", () => {
  const a = signal(1);
  const b = signal(2);
  const seen = [];
  effect(() => seen.push(a() + b()));
  expect(seen).toEqual([3]);
  const result = batch(() => {
    a(10);
    b(20);
    return "done";
  });
  expect(seen).toEqual([3, 30]);
  expect(result).toBe("done");
});

test("effectScope groups child effects for batched disposal", () => {
  const s = signal(0);
  const seen = [];
  const stop = effectScope(() => {
    effect(() => seen.push("a:" + s()));
    effect(() => seen.push("b:" + s()));
  });
  s(1);
  expect(seen).toEqual(["a:0", "b:0", "a:1", "b:1"]);
  stop();
  s(2);
  expect(seen).toEqual(["a:0", "b:0", "a:1", "b:1"]);
});

test("isSignal / isComputed type discriminators", () => {
  const s = signal(1);
  const c = computed(() => s() + 1);
  expect(isSignal(s)).toBe(true);
  expect(isComputed(c)).toBe(true);
  expect(isSignal(c)).toBe(false);
  expect(isComputed(s)).toBe(false);
  expect(isSignal(() => {})).toBe(false);
});

test("multiple effect re-runs notify a spy", () => {
  const s = signal(0);
  const spy = vi.fn(() => s());
  effect(spy);
  s(1);
  s(2);
  expect(spy).toHaveBeenCalledTimes(3);
});
