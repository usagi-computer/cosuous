import { test, expect, vi } from "vitest";
import { o, root, on } from "cosuous/observable";

test("registers a dependency", () => {
  root(function () {
    var d = o(1),
      callSpy = vi.fn(),
      f = on(d, function () {
        callSpy();
      });

    expect(callSpy.mock.calls.length).toBe(1);

    d(2);

    expect(callSpy.mock.calls.length).toBe(2);
  });
});

test("prohibits dynamic dependencies", () => {
  root(function () {
    var d = o(1),
      callSpy = vi.fn(),
      s = on(
        function () {},
        function () {
          callSpy();
          return d();
        },
      );

    expect(callSpy.mock.calls.length).toBe(1);

    d(2);

    expect(callSpy.mock.calls.length).toBe(1);
  });
});

test("allows multiple dependencies", () => {
  root(function () {
    var a = o(1),
      b = o(2),
      c = o(3),
      callSpy = vi.fn(),
      f = on(
        function () {
          a();
          b();
          c();
        },
        function () {
          callSpy();
        },
      );

    expect(callSpy.mock.calls.length).toBe(1);

    a(4);
    b(5);
    c(6);

    expect(callSpy.mock.calls.length).toBe(4);
  });
});

test("allows an array of dependencies", () => {
  root(function () {
    var a = o(1),
      b = o(2),
      c = o(3),
      callSpy = vi.fn(),
      f = on([a, b, c], function () {
        callSpy();
      });

    expect(callSpy.mock.calls.length).toBe(1);

    a(4);
    b(5);
    c(6);

    expect(callSpy.mock.calls.length).toBe(4);
  });
});

test("modifies its accumulator when reducing", () => {
  root(function () {
    var a = o(1),
      c = on(
        a,
        function (sum) {
          return sum + a();
        },
        0,
      );

    expect(c()).toBe(1);

    a(2);

    expect(c()).toBe(3);

    a(3);
    a(4);

    expect(c()).toBe(10);
  });
});

test("suppresses initial run when onchanges is true", () => {
  root(function () {
    var a = o(1),
      c = on(
        a,
        function () {
          return a() * 2;
        },
        0,
        true,
      );

    expect(c()).toBe(0);

    a(2);

    expect(c()).toBe(4);
  });
});
