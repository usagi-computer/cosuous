import { bench, describe } from "vitest";
import { batch, computed, effect, signal } from "cosuous/signal";

describe("signal read/write", () => {
  const s = signal(0);
  bench("read", () => {
    s();
  });
  bench("write", () => {
    s(s() + 1);
  });
});

describe("computed", () => {
  const a = signal(1);
  const b = signal(2);
  const c = computed(() => a() + b());
  bench("read derived", () => {
    c();
  });
  bench("invalidate + read", () => {
    a(a() + 1);
    c();
  });
});

describe("effect propagation", () => {
  bench("setup + dispose", () => {
    const s = signal(0);
    const stop = effect(() => {
      s();
    });
    stop();
  });
  bench("re-run on write", () => {
    const s = signal(0);
    let last;
    const stop = effect(() => {
      last = s();
    });
    for (let i = 0; i < 100; i++) s(i);
    stop();
    void last;
  });
});

describe("batch coalescing", () => {
  const s = signal(0);
  const t = signal(0);
  let last = 0;
  const stop = effect(() => {
    last = s() + t();
  });
  bench("batched dual write", () => {
    batch(() => {
      s(s() + 1);
      t(t() + 1);
    });
    void last;
  });
  bench("unbatched dual write", () => {
    s(s() + 1);
    t(t() + 1);
    void last;
  });
  // Effect is intentionally never stopped; benches share its lifetime.
  void stop;
});
