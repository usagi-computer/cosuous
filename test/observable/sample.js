import { test, expect } from "vitest";
import { o, S, sample } from "cosuous/observable";

test("avoids a depdendency", () => {
  var a = o(1),
    b = o(2),
    c = o(3),
    d = 0;

  S(function () {
    d++;
    a();
    sample(b);
    c();
  });

  expect(d).toBe(1);

  b(4);

  expect(d).toBe(1);

  a(5);
  c(6);

  expect(d).toBe(3);
});
