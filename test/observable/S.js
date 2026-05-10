import { test, expect, vi } from "vitest";
import { o, S } from "cosuous/observable";

// Tests from S.js

test("generates a function", () => {
  var f = S(function () {
    return 1;
  });
  expect(typeof f === "function").toBeTruthy();
});

test("returns initial value of wrapped function", () => {
  var f = S(function () {
    return 1;
  });
  expect(f()).toBe(1);
});

test("occurs once intitially", () => {
  var callSpy = vi.fn();
  S(callSpy);
  expect(callSpy.mock.calls.length).toBe(1);
});

test("does not re-occur when read", () => {
  var callSpy = vi.fn(),
    f = S(callSpy);
  f();
  f();
  f();

  expect(callSpy.mock.calls.length).toBe(1);
});

test("updates when S.data is set", () => {
  var d = o(1),
    fevals = 0;

  S(function () {
    fevals++;
    return d();
  });
  fevals = 0;

  d(1);
  expect(fevals).toBe(1);
});

test("does not update when S.data is read", () => {
  var d = o(1),
    fevals = 0;

  S(function () {
    fevals++;
    return d();
  });
  fevals = 0;

  d();
  expect(fevals).toBe(0);
});

test("updates return value", () => {
  var d = o(1),
    f = S(function () {
      return d();
    });

  d(2);
  expect(f()).toBe(2);
});

test("set works from other computed", () => {
  var banana = o();
  var count = 0;
  S(() => {
    count++;
    return banana() + " shake";
  });
  expect(count).toBe(1);

  var carrot = o();
  S(() => {
    console.log("banana false");
    banana(false);

    carrot() + " soup";

    console.log("banana true");
    banana(true);
  });

  carrot("carrot");
  expect(count).toBe(5);

  banana(false);
  expect(count).toBe(6);
});

(function () {
  var i, j, e, fevals, f;

  function init() {
    i = o(true);
    j = o(1);
    e = o(2);
    fevals = 0;
    f = S(function () {
      fevals++;
      return i() ? j() : e();
    });
    fevals = 0;
  }

  test("updates on active dependencies", () => {
    init();
    j(5);
    expect(fevals).toBe(1);
    expect(f()).toBe(5);
  });

  test("does not update on inactive dependencies", () => {
    init();
    e(5);
    expect(fevals).toBe(0);
    expect(f()).toBe(1);
  });

  test("deactivates obsolete dependencies", () => {
    init();
    i(false);
    fevals = 0;
    j(5);
    expect(fevals).toBe(0);
  });

  test("activates new dependencies", () => {
    init();
    i(false);
    fevals = 0;
    e(5);
    expect(fevals).toBe(1);
  });
})();

test("does not register a dependency", () => {
  var fevals = 0,
    d;

  S(function () {
    fevals++;
    d = o(1);
  });

  fevals = 0;
  d(2);
  expect(fevals).toBe(0);
});

test("reads as undefined", () => {
  var f = S(function () {});
  expect(f()).toBe(undefined);
});

test("reduces seed value", () => {
  var a = o(5),
    f = S(function (v) {
      return v + a();
    }, 5);
  expect(f()).toBe(10);
  a(6);
  expect(f()).toBe(16);
});

(function () {
  var d, fcount, f, gcount, g;

  function init() {
    ((d = o(1)),
      (fcount = 0),
      (f = S(function () {
        fcount++;
        return d();
      })),
      (gcount = 0),
      (g = S(function () {
        gcount++;
        return f();
      })));
  }

  test("does not cause re-evaluation", () => {
    init();
    expect(fcount).toBe(1);
  });

  test("does not occur from a read", () => {
    init();
    f();
    expect(gcount).toBe(1);
  });

  test("does not occur from a read of the watcher", () => {
    init();
    g();
    expect(gcount).toBe(1);
  });

  test("occurs when computation updates", () => {
    init();
    d(2);
    expect(fcount).toBe(2);
    expect(gcount).toBe(2);
    expect(g()).toBe(2);
  });
})();

// test("throws when continually setting a direct dependency", function () {
//   var d = S.data(1);

//   t.equal(function () {
//       S(function () { d(); d(2); });
//   }).toThrow();
// });

// test("throws when continually setting an indirect dependency", function () {
//   var d = S.data(1),
//       f1 = S(function () { return d(); }),
//       f2 = S(function () { return f1(); }),
//       f3 = S(function () { return f2(); });

//   t.equal(function () {
//       S(function () { f3(); d(2); });
//   }).toThrow();
// });

// test("throws when cycle created by modifying a branch", function () {
//   var d = S.data(1),
//       f = S(function () { return f ? f() : d(); });

//   t.equal(function () { d(0); }).toThrow();
// });

test("propagates in topological order", () => {
  //
  //     c1
  //    /  \
  //   /    \
  //  b1     b2
  //   \    /
  //    \  /
  //     a1
  //
  var seq = "",
    a1 = o(true),
    b1 = S(function () {
      a1();
      seq += "b1";
    }),
    b2 = S(function () {
      a1();
      seq += "b2";
    }),
    c1 = S(function () {
      (b1(), b2());
      seq += "c1";
    });

  seq = "";
  a1(true);

  expect(seq).toBe("b1b2c1");
});

test("only propagates once with linear convergences", () => {
  //         d
  //         |
  // +---+---+---+---+
  // v   v   v   v   v
  // f1  f2  f3  f4  f5
  // |   |   |   |   |
  // +---+---+---+---+
  //         v
  //         g
  var d = o(0),
    f1 = S(function () {
      return d();
    }),
    f2 = S(function () {
      return d();
    }),
    f3 = S(function () {
      return d();
    }),
    f4 = S(function () {
      return d();
    }),
    f5 = S(function () {
      return d();
    }),
    gcount = 0,
    g = S(function () {
      gcount++;
      return f1() + f2() + f3() + f4() + f5();
    });

  gcount = 0;
  d(0);
  expect(gcount).toBe(1);
});

test("only propagates once with exponential convergence", () => {
  //     d
  //     |
  // +---+---+
  // v   v   v
  // f1  f2 f3
  //   \ | /
  //     O
  //   / | \
  // v   v   v
  // g1  g2  g3
  // +---+---+
  //     v
  //     h
  var d = o(0),
    f1 = S(function () {
      return d();
    }),
    f2 = S(function () {
      return d();
    }),
    f3 = S(function () {
      return d();
    }),
    g1 = S(function () {
      return f1() + f2() + f3();
    }),
    g2 = S(function () {
      return f1() + f2() + f3();
    }),
    g3 = S(function () {
      return f1() + f2() + f3();
    }),
    hcount = 0,
    h = S(function () {
      hcount++;
      return g1() + g2() + g3();
    });

  hcount = 0;
  d(0);
  expect(hcount).toBe(1);
});
