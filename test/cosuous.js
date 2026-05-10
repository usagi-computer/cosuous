import { test, expect } from "vitest";
import { signal, html } from "cosuous";
import { effect } from "cosuous/signal";
import { map } from "cosuous/map";
import { fragInnerHTML } from "./_utils.js";

test("simple", () => {
  expect(html`<h1></h1>`.outerHTML).toBe("<h1></h1>");
  expect(html`<h1>hello world</h1>`.outerHTML).toBe("<h1>hello world</h1>");
});

test("returns a simple string", () => {
  const frag = html`a`;
  expect(frag instanceof DocumentFragment).toBeTruthy();
  expect(frag.childNodes[0] instanceof Text).toBeTruthy();
  expect(frag.childNodes[0].textContent).toBe("a");
});

test("returns a simple number", () => {
  const frag = html`${9}`;
  expect(frag instanceof DocumentFragment).toBeTruthy();
  expect(frag.childNodes[0] instanceof Text).toBeTruthy();
  expect(frag.childNodes[0].textContent).toBe("9");
});

test("returns a document fragment", () => {
  const frag = html`${[html`<div>Banana</div>`, html`<div>Apple</div>`]}`;
  expect(frag instanceof DocumentFragment).toBeTruthy();
  expect(frag.childNodes[0].outerHTML).toBe("<div>Banana</div>");
  expect(frag.childNodes[1].outerHTML).toBe("<div>Apple</div>");
});

test("returns a simple signal string", () => {
  const title = signal("Banana");
  const frag = html`${title}`;
  expect(frag instanceof DocumentFragment).toBeTruthy();
  expect(frag.childNodes[0] instanceof Text).toBeTruthy();
  expect(frag.childNodes[0].textContent).toBe("Banana");
});

test("component children order", () => {
  let order = "";
  const Comp = (props, ...children) => {
    order += "a";
    return children;
  };
  const Child = () => {
    order += "b";
    return html`<b />`;
  };

  const result = html`
    <${Comp}>
      <${Child} />
    <//>
  `;

  expect(order).toBe("ab");
  expect(fragInnerHTML(result)).toBe("<b></b>");
});

test("conditional lists without root", () => {
  const choice = signal(1);
  const filler = signal(0);

  const Spinner = () => html`<div class="spinner" />`;

  const Story = (index) => {
    const n1 = `a${index}`;
    const n2 = `b${index}`;
    const list = signal();

    effect(() => {
      if (filler() === index) list([n1, n2]);
    });

    return html`${() => (list() ? map(list, (item) => html`<i>${item}</i>`) : Spinner())}`;
  };

  const log = (el, ...args) => {
    console.warn(
      Array.from(el.childNodes)
        .map((c) => `${c}${c.__g ? "," + c.__g : ""}`)
        .join(" — "),
      ...args,
    );
    console.warn("");
  };

  const firstStory = Story(1);

  console.warn("raw story 1 element");
  log(firstStory);
  const stories = [firstStory, Story(2), Story(3)];

  const div = html`<div>${() => stories[choice() - 1]}</div>`;
  document.body.appendChild(div);
  log(div);

  console.warn("story 1 - filler 1");

  filler(1);
  expect(div.children.length).toBe(2);
  log(div);

  console.warn("story 2 - filler 2");
  choice(2);
  expect(div.children.length).toBe(1);
  log(div);

  filler(2);
  expect(div.children[0].innerText).toBe("a2");
  expect(div.children.length).toBe(2);
});

test("nested fragments without root", () => {
  const choice = signal(0);
  const show = signal(true);
  const show2 = signal(true);

  const Story = (index) => {
    const n1 = `a${index}`;
    const n2 = `b${index}`;
    const list = signal([n1, n2]);
    return html`${() => (show() ? map(list, (item) => html`<i>${item}</i>`) : "")}`;
  };

  const firstStory = Story(1);
  const stories = [firstStory, Story(2), Story(3)];

  const div = html`<div>${() => show2() && stories[choice()]}</div>`;
  document.body.appendChild(div);

  expect(div.children.length).toBe(2);
  expect(div.children[0].innerText).toBe("a1");

  show(false);
  expect(div.children.length).toBe(0);

  show(true);
  choice(1);
  expect(div.children[0].innerText).toBe("a2");

  expect(div.children.length).toBe(2);

  show(false);
  expect(div.children.length).toBe(0);

  show(true);
  choice(2);

  expect(div.children.length).toBe(2);

  show2(false);
  expect(div.children.length).toBe(0);

  choice(1);
  // Force Story effects to re-run so the now-detached endMarks get re-attached
  // to their original fragments. alien-signals (unlike sinuous) only notifies
  // observers on a value change, so a redundant `show(true)` would be a no-op.
  show(false);
  show(true);
  show2(true);

  expect(div.children.length).toBe(2);
  expect(div.children[0].innerText).toBe("a2");
});
