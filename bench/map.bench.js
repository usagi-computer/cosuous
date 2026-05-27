import { bench, describe } from "vitest";
import { signal } from "cosuous";
import { map } from "cosuous/map";

const makeItems = (n) => Array.from({ length: n }, (_, i) => ({ id: i, label: "row-" + i }));

describe("map create (initial render)", () => {
  bench("100 rows", () => {
    const items = signal(makeItems(100));
    const frag = map(items, (it) => ({ type: "div", _props: it.label }));
    void frag;
  });
  bench("1000 rows", () => {
    const items = signal(makeItems(1000));
    const frag = map(items, (it) => ({ type: "div", _props: it.label }));
    void frag;
  });
});
