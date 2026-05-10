import { test, expect } from "vitest";
import { o, S, root, transaction } from "cosuous/observable";

test("batches all changes until end", () => {
  var d1 = o(9);
  var d2 = o(99);

  transaction(function () {
    d1(10);
    d2(100);
    expect(d1()).toBe(9);
    expect(d2()).toBe(99);
  });

  expect(d1()).toBe(10);
  expect(d2()).toBe(100);
});

test("halts propagation within its scope", () => {
  root(function () {
    var d1 = o(9);
    var d2 = o(99);

    var f = S(function () {
      return d1() + d2();
    });

    transaction(function () {
      d1(10);
      d2(100);

      expect(f()).toBe(9 + 99);
    });

    expect(f()).toBe(10 + 100);
  });
});

test("nested transaction", () => {
  var d = o(1);

  transaction(function () {
    d(2);
    expect(d()).toBe(1);

    transaction(function () {
      d(3);
      expect(d()).toBe(1);

      transaction(function () {
        d(4);
      });

      expect(d()).toBe(1);
    });

    expect(d()).toBe(1);
  });

  expect(d()).toBe(4);
});
