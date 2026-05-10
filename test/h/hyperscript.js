import { test, expect, vi } from "vitest";
import { signal, h, hs } from "cosuous";

test("simple", () => {
  expect(h("h1").outerHTML).toBe("<h1></h1>");
  expect(h("h1", "hello world").outerHTML).toBe("<h1>hello world</h1>");
});

test("nested", () => {
  expect(h("div", h("h1", "Title"), h("p", "Paragraph")).outerHTML).toBe(
    "<div><h1>Title</h1><p>Paragraph</p></div>",
  );
});

test("arrays for nesting is ok", () => {
  expect(h("div", [h("h1", "Title"), h("p", "Paragraph")]).outerHTML).toBe(
    "<div><h1>Title</h1><p>Paragraph</p></div>",
  );
});

test("can use namespace in name", () => {
  expect(h("myns:mytag").outerHTML).toBe("<myns:mytag></myns:mytag>");
});

// test('can use id selector', () => {
//   expect(h('div#frame').outerHTML).toBe('<div id="frame"></div>');
//
// });

// test('can use class selector', () => {
//   expect(h('div.panel').outerHTML).toBe('<div class="panel"></div>');
//
// });

// test('can default element types', () => {
//   expect(h('.panel').outerHTML).toBe('<div class="panel"></div>');
//   expect(h('#frame').outerHTML).toBe('<div id="frame"></div>');
//
// });

test("can set properties", () => {
  let a = h("a", { href: "http://google.com" });
  expect(a.href).toBe("http://google.com/");
  let checkbox = h("input", { name: "yes", type: "checkbox" });
  expect(checkbox.outerHTML).toBe('<input name="yes" type="checkbox">');
});

test("(un)registers an event handler", () => {
  // don't try the focus event, valid tests fail in IE11

  let click = vi.fn();
  let btn = h("button", { onclick: click }, "something");
  document.body.appendChild(btn);

  btn.click();
  expect(click.mock.calls.length).toBe(1);

  h(btn, { onclick: false });
  btn.click();
  expect(click.mock.calls.length).toBe(1);

  btn.parentNode.removeChild(btn);
});

test("(un)registers a signal event handler", () => {
  // don't try the focus event, valid tests fail in IE11

  let click = vi.fn();
  let onclick = signal(click);
  let btn = h("button", { onclick }, "something");
  document.body.appendChild(btn);

  btn.click();
  expect(click.mock.calls.length).toBe(1);

  onclick(false);
  btn.click();
  expect(click.mock.calls.length).toBe(1);

  btn.parentNode.removeChild(btn);
});

// test('registers event handlers', () => {
//   let click = vi.fn();
//   let btn = h('button', { events: { click: () => click } }, 'something');
//   document.body.appendChild(btn);

//   btn.click();
//   expect(click.mock.calls.length).toBe(1);

//   btn.parentNode.removeChild(btn);
//
// });

// test('can use bindings', () => {
//   h.bindings.innerHTML = (el, value) => (el.innerHTML = value);

//   let el = h('div', { $innerHTML: '<b>look ma, no node value</b>' });
//   expect(el.outerHTML).toBe('<div><b>look ma, no node value</b></div>');
//
// });

test("sets styles", () => {
  let div = h("div", { style: { color: "red" } });
  expect(div.style.color).toBe("red");
});

test("sets styles as text", () => {
  let div = h("div", { style: "color: red" });
  expect(div.style.color).toBe("red");
});

// test('sets classes', () => {
//   let div = h('div', { classList: { play: true, pause: true } });
//   expect(div.classList.contains('play')).toBeTruthy();
//   expect(div.classList.contains('pause')).toBeTruthy();
//
// });

test("sets attributes", () => {
  let div = h("div", { attrs: { checked: "checked" } });
  expect(div.hasAttribute("checked")).toBeTruthy();
});

test("sets data attributes", () => {
  let div = h("div", { "data-value": 5 });
  expect(div.getAttribute("data-value")).toBe("5"); // failing for IE9
});

test("sets aria attributes", () => {
  let div = h("div", { "aria-hidden": true });
  expect(div.getAttribute("aria-hidden")).toBe("true");
});

// test('sets refs', () => {
//   let ref;
//   let div = h('div', { ref: el => (ref = el) });
//   expect(div).toBe(ref);
//
// });

test("boolean, number, get to-string'ed", () => {
  let e = h("p", true, false, 4);
  expect(e.outerHTML.match(/<p>truefalse4<\/p>/)).toBeTruthy();
});

// test('unicode selectors', () => {
//   expect(h('.⛄').outerHTML).toBe('<div class="⛄"></div>');
//   expect(h('span#⛄').outerHTML).toBe('<span id="⛄"></span>');
//
// });

test("can use fragments", () => {
  const insertCat = () => "cat";
  let frag = h([h("div", "First"), insertCat, h("div", "Last")]);

  const div = document.createElement("div");
  div.appendChild(frag);
  expect(div.innerHTML).toBe("<div>First</div>cat<div>Last</div>");
});

test("can use components", () => {
  const insertCat = ({ id, drink }) => h("div", { id, textContent: drink });

  let frag = h([h("div", "First"), h(insertCat, { id: "cat", drink: "milk" }), h("div", "Last")]);

  const div = document.createElement("div");
  div.appendChild(frag);
  expect(div.innerHTML).toBe('<div>First</div><div id="cat">milk</div><div>Last</div>');
});

// Regression for sinuous#183: JSX emits h(Component, null, ...children) when
// no props are passed; the component should be able to destructure props
// without first falling back to `props || {}`.
test("sinuous#183 - components receive {} when JSX passes null props", () => {
  const Greet = ({ name = "world" }, ...children) => h("p", "Hi ", name, ...children);
  const el = h(Greet, null, "!");
  expect(el.outerHTML).toBe("<p>Hi world!</p>");
});
