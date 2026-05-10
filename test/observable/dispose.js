import { test, expect } from "vitest";
import { o, S, root } from "cosuous/observable";

test("disables updates and sets computation's value to undefined", () => {
  root(function (dispose) {
    var c = 0,
      d = o(0),
      f = S(function () {
        c++;
        return d();
      });

    expect(c).toBe(1);
    expect(f()).toBe(0);

    d(1);

    expect(c).toBe(2);
    expect(f()).toBe(1);

    dispose();

    d(2);

    expect(c).toBe(2);
    expect(f()).toBe(1);
  });
});

// unconventional uses of dispose -- to insure S doesn't behaves as expected in these cases

test("works from the body of its own computation", () => {
  root(function (dispose) {
    var c = 0,
      d = o(0),
      f = S(function () {
        c++;
        if (d()) dispose();
        d();
      });

    expect(c).toBe(1);

    d(1);
    expect(c).toBe(2);

    d(2);
    expect(c).toBe(2);
  });
});

test("works from the body of a subcomputation", () => {
  root(function (dispose) {
    var c = 0,
      d = o(0),
      f = S(function () {
        c++;
        d();
        S(function () {
          if (d()) dispose();
        });
      });

    expect(c).toBe(1);

    d(1);

    expect(c).toBe(2);

    d(2);

    expect(c).toBe(2);
  });
});
