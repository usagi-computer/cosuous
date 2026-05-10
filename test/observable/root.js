import { test, expect } from "vitest";
import { o, S, root } from "cosuous/observable";

test("allows subcomputations to escape their parents", () => {
  root(function () {
    var outerTrigger = o(null),
      innerTrigger = o(null),
      innerRuns = 0;

    S(function () {
      // register dependency to outer trigger
      outerTrigger();
      // inner computation
      root(function () {
        S(function () {
          // register dependency on inner trigger
          innerTrigger();
          // count total runs
          innerRuns++;
        });
      });
    });

    // at start, we have one inner computation, that's run once
    expect(innerRuns).toBe(1);

    // trigger the outer computation, making more inners
    outerTrigger(null);
    outerTrigger(null);

    expect(innerRuns).toBe(3);

    // now trigger inner signal: three orphaned computations should equal three runs
    innerRuns = 0;
    innerTrigger(null);

    expect(innerRuns).toBe(3);
  });
});

//test("is necessary to create a toplevel computation", function () {
//    t.equal(() => {
//        S(() => 1)
//    }).toThrowError(/root/);
//});

test("does not freeze updates when used at top level", () => {
  root(() => {
    var s = o(1);
    var c = S(() => s());

    expect(c()).toBe(1);
    s(2);
    expect(c()).toBe(2);
    s(3);
    expect(c()).toBe(3);
  });
});

test("persists through entire scope when used at top level", () => {
  root(() => {
    var s = o(1);

    S(() => s());
    s(2);

    var c2 = S(() => s());
    s(3);

    expect(c2()).toBe(3);
  });
});
