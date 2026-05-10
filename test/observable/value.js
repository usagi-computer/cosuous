import { test, expect } from "vitest";
import { o, S, root } from "cosuous/observable";

function value(current, eq) {
  const v = o(current);
  return function (update) {
    if (!arguments.length) return v();
    if (!(eq ? eq(update, current) : update === current)) {
      current = v(update);
    }
    return update;
  };
}

test("takes and returns an initial value", () => {
  expect(value(1)()).toBe(1);
});

test("can be set by passing in a new value", () => {
  var d = value(1);
  d(2);
  expect(d()).toBe(2);
});

test("returns value being set", () => {
  var d = value(1);
  expect(d(2)).toBe(2);
});

test("does not propagate if set to equal value", () => {
  root(function () {
    var d = value(1),
      e = 0,
      f = S(function () {
        d();
        return ++e;
      });

    expect(f()).toBe(1);
    d(1);
    expect(f()).toBe(1);
  });
});

test("propagate if set to unequal value", () => {
  root(function () {
    var d = value(1),
      e = 0,
      f = S(function () {
        d();
        return ++e;
      });

    expect(f()).toBe(1);
    d(1);
    expect(f()).toBe(1);
    d(2);
    expect(f()).toBe(2);
  });
});

test("can take an equality predicate", () => {
  root(function () {
    var d = value([1], function (a, b) {
        return a[0] === b[0];
      }),
      e = 0,
      f = S(function () {
        d();
        return ++e;
      });

    expect(f()).toBe(1);
    d([1]);
    expect(f()).toBe(1);
    d([2]);
    expect(f()).toBe(2);
  });
});
