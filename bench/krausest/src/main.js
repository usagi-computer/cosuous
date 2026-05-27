/*
 * cosuous (keyed) entry for the js-framework-benchmark harness.
 * Adapted from the upstream `frameworks/keyed/sinuous/` entry by Wesley Luyten,
 * retargeted to cosuous's signal API. License: Apache-2.0 (upstream).
 *
 * The harness drives a fixed UI surface: buttons run / runlots / add / update /
 * clear / swaprows, a tbody#tbody, and rows with id="row<N>" carrying a
 * `selected` row that takes class "danger". Keep that contract exact.
 */

import { html, signal } from "cosuous";
import { map } from "cosuous/map";

const adjectives = [
  "pretty",
  "large",
  "big",
  "small",
  "tall",
  "short",
  "long",
  "handsome",
  "plain",
  "quaint",
  "clean",
  "elegant",
  "easy",
  "angry",
  "crazy",
  "helpful",
  "mushy",
  "odd",
  "unsightly",
  "adorable",
  "important",
  "inexpensive",
  "cheap",
  "expensive",
  "fancy",
];
const colors = [
  "red",
  "yellow",
  "blue",
  "green",
  "pink",
  "brown",
  "purple",
  "white",
  "black",
  "orange",
];
const nouns = [
  "table",
  "chair",
  "house",
  "bbq",
  "desk",
  "car",
  "pony",
  "cookie",
  "sandwich",
  "burger",
  "pizza",
  "mouse",
  "keyboard",
];

let nextId = 1;
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

function buildData(count) {
  const data = new Array(count);
  for (let i = 0; i < count; i++) {
    data[i] = {
      id: nextId++,
      label: signal(`${pick(adjectives)} ${pick(colors)} ${pick(nouns)}`),
    };
  }
  return data;
}

const rows = signal([]);
const selected = signal(0);

const run = () => rows(buildData(1000));
const runLots = () => rows(buildData(10000));
const add = () => rows(rows().concat(buildData(1000)));
const update = () => {
  const r = rows();
  for (let i = 0; i < r.length; i += 10) r[i].label(r[i].label() + " !!!");
};
const clear = () => rows([]);
const swapRows = () => {
  const r = rows();
  if (r.length <= 998) return;
  const next = r.slice();
  [next[1], next[998]] = [next[998], next[1]];
  rows(next);
};
const select = (id) => selected(id);
const remove = (id) => rows(rows().filter((row) => row.id !== id));

const Row = (item) => {
  const id = item.id;
  const rowClass = () => (selected() === id ? "danger" : "");
  return html`
    <tr class=${rowClass} id=${"row" + id}>
      <td class="col-md-1">${id}</td>
      <td class="col-md-4">
        <a onclick=${() => select(id)}>${item.label}</a>
      </td>
      <td class="col-md-1">
        <a onclick=${() => remove(id)}>
          <span class="glyphicon glyphicon-remove" aria-hidden="true"></span>
        </a>
      </td>
      <td class="col-md-6"></td>
    </tr>
  `;
};

const Button = (id, text, fn) => html`
  <div class="col-sm-6 smallpad">
    <button type="button" class="btn btn-primary btn-block" id=${id} onclick=${fn}>${text}</button>
  </div>
`;

const App = () => html`
  <div class="container">
    <div class="jumbotron">
      <div class="row">
        <div class="col-md-6"><h1>cosuous (keyed)</h1></div>
        <div class="col-md-6">
          <div class="row">
            ${Button("run", "Create 1,000 rows", run)}
            ${Button("runlots", "Create 10,000 rows", runLots)}
            ${Button("add", "Append 1,000 rows", add)}
            ${Button("update", "Update every 10th row", update)} ${Button("clear", "Clear", clear)}
            ${Button("swaprows", "Swap Rows", swapRows)}
          </div>
        </div>
      </div>
    </div>
    <table class="table table-hover table-striped test-data">
      <tbody id="tbody">
        ${map(rows, Row)}
      </tbody>
    </table>
    <span class="preloadicon glyphicon glyphicon-remove" aria-hidden="true"></span>
  </div>
`;

document.getElementById("main").appendChild(App());
