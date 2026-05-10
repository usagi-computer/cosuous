import { test, expect, vi } from "vitest";
import { h, html } from "cosuous";
import { template, s, t } from "cosuous/template";
import { map } from "cosuous/map";
import { normalizeAttributes } from "./_utils.js";

test("tags return functions", () => {
  expect(typeof s() === "function").toBeTruthy();
  expect(typeof t() === "function").toBeTruthy();
});

test("template returns a function", () => {
  expect(typeof template(() => h("h1")) === "function").toBeTruthy();
});

test("template result returns an element", () => {
  expect(template(() => h("h1"))().firstChild.outerHTML).toBe("<h1></h1>");
});

test("template result fills tags", () => {
  expect(template(() => h("h1", t("title")))({ title: "Test" }).firstChild.outerHTML).toBe(
    "<h1>Test</h1>",
  );
});

test("template works w/ event listeners", () => {
  const buttonClick = vi.fn();
  const obj = { buttonClick };
  const btn = template(() => h("button", { onclick: s("buttonClick") }, "Click me"))(
    obj,
  ).firstChild;

  btn.click();
  expect(buttonClick.mock.calls.length).toBe(1);

  obj.buttonClick = vi.fn();
  btn.click();
  expect(obj.buttonClick.mock.calls.length).toBe(1);

  expect(buttonClick.mock.calls.length).toBe(1);
});

test("template result fills signal tags", () => {
  const obj = { title: "Apple", class: "juice" };
  const tmpl = template(() =>
    h("h1", h("span", { class: s("class") }, "Pear"), h("span", s("title"))),
  )(obj);

  expect(tmpl.firstChild.children[0].outerHTML).toBe('<span class="juice">Pear</span>');
  expect(tmpl.firstChild.children[1].outerHTML).toBe("<span>Apple</span>");

  obj.title = "⛄️";
  obj.class = "mousse";

  expect(obj.title).toBe("⛄️");
  expect(tmpl.firstChild.children[0].outerHTML).toBe('<span class="mousse">Pear</span>');
  expect(tmpl.firstChild.children[1].outerHTML).toBe("<span>⛄️</span>");
});

test("template result fills tags w/ same value", () => {
  const title = template(() => h("h1", t("title")));
  expect(title({ title: "Test" }).firstChild.outerHTML).toBe("<h1>Test</h1>");
  expect(title({ title: "Test" }).firstChild.outerHTML).toBe("<h1>Test</h1>");
});

test("template result fills multiple signal tags w/ same key", () => {
  const title = template(() =>
    h("h1", { class: s("title") }, h("b", s("title")), h("i", s("title"))),
  );
  const obj = {
    title: "",
  };

  const rendered = title(obj);
  obj.title = "banana";

  expect(rendered.firstChild.outerHTML).toBe('<h1 class="banana"><b>banana</b><i>banana</i></h1>');
});

test("template works with map", () => {
  const Row = template(
    () => html`
      <tr class=${s("selected")}>
        <td class="col-md-1">${t("id")}</td>
        <td class="col-md-4"><a>${s("label")}</a></td>
        <td class="col-md-1">
          <a>
            <span class="glyphicon glyphicon-remove remove" aria-hidden="true" />
          </a>
        </td>
        <td class="col-md-6" />
      </tr>
    `,
  );

  const rows = () =>
    [1, 2].map((id) => ({
      id,
      label: `Label ${id}`,
    }));

  const table = document.createElement("table");
  table.appendChild(map(rows, Row));

  expect(normalizeAttributes(table.innerHTML)).toBe(
    normalizeAttributes(
      `<tr>
        <td class="col-md-1">1</td>
        <td class="col-md-4"><a>Label 1</a></td>
        <td class="col-md-1"><a>
          <span class="glyphicon glyphicon-remove remove" aria-hidden="true"></span>
        </a></td>
        <td class="col-md-6"></td>
      </tr>
      <tr>
        <td class="col-md-1">2</td>
        <td class="col-md-4"><a>Label 2</a></td>
        <td class="col-md-1"><a>
          <span class="glyphicon glyphicon-remove remove" aria-hidden="true"></span>
        </a></td>
        <td class="col-md-6"></td>
      </tr>`.replace(/>[\s]+</g, "><"),
    ),
  );
});
