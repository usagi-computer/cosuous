import { test, expect, vi } from "vitest";
import { o, S, transaction, observable, sample } from "cosuous/observable";

test("parent cleans up inner subscriptions", () => {
  let i = 0;

  const data = o(null);
  const cache = o(false);

  let childValue;
  let childValue2;

  const child = (d) => {
    S(function nested() {
      childValue = d();
      i++;
    });
    return "Hi";
  };

  const child2 = (d) => {
    S(function nested2() {
      childValue2 = d();
    });
    return "Hi";
  };

  S(function cacheFun(prev) {
    const d = !!data();
    if (d === prev) {
      return prev;
    }
    cache(d);
    return d;
  });

  // Run 1st time
  S(function memo() {
    cache();
    child2(data);
    child(data);
  });

  // 2nd
  data("name");
  expect(childValue).toBe("name");
  expect(childValue2).toBe("name");

  // 3rd
  data(null);
  expect(childValue).toBe(null);
  expect(childValue2).toBe(null);

  // 4th
  data("name2");
  expect(childValue).toBe("name2");
  expect(childValue2).toBe("name2");

  expect(i).toBe(4);
});

test("parent cleans up inner conditional subscriptions", () => {
  let i = 0;

  const data = o(null);
  const cache = o(false);

  let childValue;

  const child = (d) => {
    S(function nested() {
      childValue = d();
      i++;
    });
    return "Hi";
  };

  S(function cacheFun(prev) {
    const d = !!data();
    if (d === prev) {
      return prev;
    }
    cache(d);
    return d;
  });

  const memo = S(() => {
    const c = cache();
    return c ? child(data) : undefined;
  });

  let view;
  S(() => (view = memo()));

  expect(view).toBe(undefined);

  // Run 1st time
  data("name");
  expect(childValue).toBe("name");

  expect(view).toBe("Hi");

  // 2nd
  data("name2");
  expect(childValue).toBe("name2");

  // data is null -> cache is false -> child is not run here
  data(null);
  expect(childValue).toBe("name2");

  expect(view).toBe(undefined);

  expect(i).toBe(2);
});

test("parent cleans up inner conditional subscriptions w/ other child", () => {
  let i = 0;

  const data = o(null);
  const cache = o(false);

  let childValue;
  let childValue2;

  const child = (d) => {
    S(function nested() {
      childValue = d();
      i++;
    });
    return "Hi";
  };

  const child2 = (d) => {
    S(function nested2() {
      childValue2 = d();
    });
    return "Hi";
  };

  S(function cacheFun(prev) {
    const d = !!data();
    if (d === prev) {
      return prev;
    }
    cache(d);
    return d;
  });

  // Run 1st time
  const memo = S(() => {
    const c = cache();
    child2(data);
    return c ? child(data) : undefined;
  });

  let view;
  S(() => (view = memo()));

  expect(view).toBe(undefined);

  // 2nd
  data("name");
  expect(childValue).toBe("name");
  expect(childValue2).toBe("name");

  expect(view).toBe("Hi");

  // 3rd
  data(null);
  expect(childValue).toBe("name");
  expect(childValue2).toBe(null);

  expect(view).toBe(undefined);

  // 4th
  data("name2");
  expect(childValue).toBe("name2");
  expect(childValue2).toBe("name2");

  expect(i).toBe(2);
});

test("deeply nested cleanup of subscriptions", () => {
  const data = o(null);

  const spy1 = vi.fn();
  spy1.mockImplementation(() => {
    spy2();
  });

  const spy2 = vi.fn();
  spy2.mockImplementation(() => {
    data();
    child3();
  });

  const spy3 = vi.fn();
  spy3.mockImplementation(() => {
    data();
  });

  const child1 = () => {
    S(spy1);
    return "Hi";
  };

  const child3 = () => {
    S(spy3);
    return "Hi";
  };

  S(() => {
    child1();
  });

  expect(spy1.mock.calls.length).toBe(1);
  expect(spy3.mock.calls.length).toBe(1);

  data("banana");

  expect(spy3.mock.calls.length).toBe(2);
});

test("insures that new dependencies are updated before dependee", () => {
  var order = "";
  var a = o(0);

  var b = S(function x() {
    order += "b";
    console.log("B");
    return a() + 1;
  });

  var c = S(function y() {
    order += "c";
    console.log("C");
    return b() || d();
  });

  function z() {
    order += "d";
    console.log("D");
    return a() + 10;
  }
  var d = S(z);

  expect(order).toBe("bcd");

  order = "";
  a(-1);

  expect(b()).toBe(0);
  expect(order).toBe("bcd");
  expect(d()).toBe(9);
  expect(c()).toBe(9);

  order = "";
  a(0);

  expect(order).toBe("bc");
  expect(c()).toBe(1);
});

test("unrelated state via transaction updates view correctly", () => {
  const data = observable(null),
    trigger = observable(false),
    cache = observable(sample(() => !!trigger())),
    child = (data) => {
      S(() => console.log("nested", data().length));
      return "Hi";
    };

  S((prev) => {
    const d = !!data();
    if (d === prev) return prev;
    cache(d);
    return d;
  });

  const memo = S(() => (cache() ? child(data) : undefined));

  let view;
  S(() => (view = memo()));
  expect(view).toBe(undefined);

  transaction(() => {
    trigger(true);
    data("name");
  });
  expect(view).toBe("Hi");

  transaction(() => {
    trigger(true);
    data("name2");
  });

  transaction(() => {
    data(undefined);
    trigger(false);
  });
  expect(view).toBe(undefined);
});
