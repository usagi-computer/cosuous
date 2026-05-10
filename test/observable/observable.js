import { test, expect, vi } from "vitest";
import { o, subscribe, unsubscribe, cleanup, isListening } from "cosuous/observable";

test("initial value can be set", () => {
  let title = o("Groovy!");
  expect(title()).toBe("Groovy!");
});

test("runs function on subscribe", () => {
  subscribe(() => {});
});

test("observable can be set without subscription", () => {
  let title = o();
  title("Groovy!");
  expect(title()).toBe("Groovy!");
});

test("isListening", () => {
  let title = o();
  expect(!isListening()).toBeTruthy();
  subscribe(() => {
    title();
    expect(isListening()).toBeTruthy();
  });
});

test("updates when the observable is set", () => {
  let title = o();
  let text;
  subscribe(() => (text = title()));

  title("Welcome to Sinuous!");
  expect(text).toBe("Welcome to Sinuous!");

  title("Groovy!");
  expect(text).toBe("Groovy!");
});

test("observable unsubscribe", () => {
  let title = o("Initial title");
  let text;
  const unsubscribe = subscribe(() => (text = title()));

  title("Welcome to Sinuous!");
  expect(text).toBe("Welcome to Sinuous!");

  unsubscribe();

  title("Groovy!");
  expect(text).toBe("Welcome to Sinuous!");
});

test("nested subscribe", () => {
  let apple = o("apple");
  let lemon = o("lemon");
  let onion = o("onion");
  let tempApple;
  let tempLemon;
  let tempOnion;

  let veggieSpy;
  const fruitSpy = vi.fn();
  fruitSpy.mockImplementation(() => {
    tempApple = apple();

    veggieSpy = vi.fn();
    veggieSpy.mockImplementation(() => {
      tempOnion = onion();
    });

    subscribe(veggieSpy);

    tempLemon = lemon();
  });

  subscribe(fruitSpy);

  expect(tempApple).toBe("apple");
  expect(tempLemon).toBe("lemon");
  expect(tempOnion).toBe("onion");
  expect(fruitSpy.mock.calls.length).toBe(1);
  expect(veggieSpy.mock.calls.length).toBe(1);

  onion("peel");
  expect(tempOnion).toBe("peel");
  expect(fruitSpy.mock.calls.length).toBe(1);
  expect(veggieSpy.mock.calls.length).toBe(2);

  lemon("juice");
  expect(tempLemon).toBe("juice");
  expect(fruitSpy.mock.calls.length).toBe(2);
  // this will be a new spy that was executed once
  expect(veggieSpy.mock.calls.length).toBe(1);
});

test("one level nested subscribe cleans up inner subscriptions", () => {
  let apple = o("apple");
  let lemon = o("lemon");
  let grape = o("grape");
  let onion = o("onion");
  let bean = o("bean");
  let carrot = o("carrot");
  let onions = "";
  let beans = "";
  let carrots = "";

  subscribe(() => {
    apple();
    subscribe(() => (onions += onion()));
    grape();
    subscribe(() => (beans += bean()));
    subscribe(() => (carrots += carrot()));
    lemon();
  });

  apple("juice");
  lemon("juice");
  grape("juice");

  bean("bean");

  expect(onions).toBe("onion".repeat(4));
  expect(beans).toBe("bean".repeat(5));
});

test("three level nested subscribe cleans up inner subscriptions", () => {
  let apple = o("apple");
  let lemon = o("lemon");
  let grape = o("grape");
  let onion = o("onion");
  let bean = o("bean");
  let carrot = o("carrot");
  let peanut = o("peanut");
  let onions = 0;
  let beans = 0;
  let carrots = 0;
  let peanuts = 0;

  const unsubscribe = subscribe(() => {
    apple();
    subscribe(() => {
      bean();
      beans += 1;
      subscribe(() => {
        onions += 1;
        onion();
        subscribe(() => peanut() && (peanuts += 1));
      });
    });
    grape();
    subscribe(() => carrot() && (carrots += 1));
    lemon();
  });

  apple("juice");
  lemon("juice");
  grape("juice");
  expect(beans).toBe(4);

  bean("bean");
  expect(beans).toBe(5);

  onion("onion");
  onion("onion");
  onion("onion");
  expect(onions).toBe(8);

  peanut("peanut");
  peanut("peanut");
  expect(peanuts).toBe(10);

  unsubscribe();

  apple("juice");
  lemon("juice");
  grape("juice");

  bean("bean");
  expect(beans).toBe(5);

  onion("onion");
  onion("onion");
  onion("onion");
  expect(onions).toBe(8);

  peanut("peanut");
  peanut("peanut");
  expect(peanuts).toBe(10);
});

test("standalone unsubscribe works", () => {
  let carrot = o();
  const computed = vi.fn();
  computed.mockImplementation(() => {
    carrot();
  });
  subscribe(computed);
  carrot("juice");

  unsubscribe(computed);
  carrot("juice");

  expect(computed.mock.calls.length).toBe(2);
});

test("cleanup cleans up on update", () => {
  let carrot = o();
  let button = document.createElement("button");
  // IE11 requires the button to be in dom before `button.click()` works.
  document.body.appendChild(button);
  let count = 0;

  const computed = vi.fn();
  computed.mockImplementation(() => {
    carrot();
    const onClick = () => (count += 1);
    button.addEventListener("click", onClick);
  });

  const unsubscribe = subscribe(computed);
  carrot(9);
  carrot(10);
  button.click();
  expect(count).toBe(3);
  unsubscribe();

  count = 0;
  button = document.createElement("button");
  document.body.appendChild(button);

  const computedWithCleanup = vi.fn();
  computedWithCleanup.mockImplementation(() => {
    carrot();
    const onClick = () => (count += 1);
    button.addEventListener("click", onClick);
    cleanup(() => button.removeEventListener("click", onClick));
  });

  subscribe(computedWithCleanup);
  carrot(9);
  carrot(10);
  button.click();
  expect(count).toBe(1);
});
