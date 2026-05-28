# <a href="https://github.com/usagi-computer/cosuous"><img width="300" height="48" alt="cosuous" src="https://github.com/user-attachments/assets/687a8106-5334-46ee-957a-ef6c49a37865" /></a>

[![JSR](https://jsr.io/badges/@usagi-computer/cosuous)](https://jsr.io/@usagi-computer/cosuous) [![JSR Score](https://jsr.io/badges/@usagi-computer/cosuous/score)](https://jsr.io/@usagi-computer/cosuous)

A light, fast, reactive UI library. A fork of [Sinuous](https://github.com/luwes/sinuous) by Wesley Luyten.

**jsr**: `deno add jsr:@usagi-computer/cosuous` (or `npx jsr add @usagi-computer/cosuous` from npm-based projects)  
**cdn**: `https://esm.sh/jsr/@usagi-computer/cosuous`

- **Small.** hello world counter at <!-- size:hello:start -->`~3.8kB`<!-- size:hello:end --> gzip.
- **Fast.** fine-grained reactive DOM updates; ships a [js-framework-benchmark harness](./bench) to measure against.
- **Truly reactive.** automatically derived from the app state.
- **DevEx.** no compile step needed, choose your [view syntax](#view-syntax).

### Add-ons

_Sizes are marginal gzip, what each module adds to an app already importing `cosuous`._

<!-- size:addons:start -->

| Size   | Name                                    | Description                                          |
| ------ | --------------------------------------- | ---------------------------------------------------- |
| ~0.2kB | [`cosuous/signal`](./src/signal.md)     | Signals with `alien-signals` _(included by default)_ |
| ~1.5kB | [`cosuous/map`](./src/map.ts)           | Fast list renderer                                   |
| ~1.3kB | [`cosuous/hydrate`](./src/hydrate.md)   | Hydrate static HTML                                  |
| ~1.0kB | [`cosuous/template`](./src/template.md) | Pre-rendered Template                                |

<!-- size:addons:end -->

### Examples

- [**Counter**](https://codesandbox.io/s/sinuous-counter-z6k71) (@ CodeSandbox)
- [**Analog SVG Clock**](https://sinuous.netlify.app/examples/clock/) ⏰
- [**Classic TodoMVC**](https://luwes.github.io/sinuous-todomvc/) _([GitHub Project](https://github.com/luwes/sinuous-todomvc))_
- [**JS Framework Benchmark**](https://github.com/krausest/js-framework-benchmark/blob/master/frameworks/keyed/sinuous/src/main.js) (@ GitHub)
- [**Sierpinski Triangle**](https://replit.com/@luwes/sinuous-sierpinski-triangle-demo)
- [**Three.js Boxes**](https://replit.com/@luwes/sinuous-three-boxes) 📦
- [**JSX**](https://github.com/heyheyhello/sinuous-tsx-example/tree/jsx/) _([GitHub Project @heyheyhello](https://github.com/heyheyhello/sinuous-tsx-example/tree/jsx/))_
- [**TSX**](https://github.com/heyheyhello/sinuous-tsx-example/tree/tsx/) _([GitHub Project @heyheyhello](https://github.com/heyheyhello/sinuous-tsx-example/tree/tsx/))_
- [**Simple routing**](https://codesandbox.io/s/sinuous-router-g2eud) ([@mindplay-dk](https://github.com/mindplay-dk)) 🌏
- [**Datepicker**](https://codesandbox.io/s/sinuous-date-picker-thxdt) ([@mindplay-dk](https://github.com/mindplay-dk))
- [**Hacker News**](https://codesandbox.io/s/sinuous-hacker-news-dqtf7) ([@mindplay-dk](https://github.com/mindplay-dk))
- [**7 GUIs**](https://codesandbox.io/s/github/theSherwood/7_GUIs/tree/master/sinuous) ([@theSherwood](https://github.com/theSherwood))
- [**Plain SPA**](https://github.com/johannschopplich/plain-spa) ([@johannschopplich](https://github.com/johannschopplich))

_See [complete docs](https://sinuous.netlify.app/docs/getting-started/), or in a nutshell..._

## View syntax

A goal Cosuous strives for is to have good interoperability. Cosuous creates DOM elements via **hyperscript** `h` calls. This allows the developer more freedom in the choice of the view syntax.

**Hyperscript** directly call `h(type: string, props: object, ...children)`.

**Tagged templates** transform the HTML to `h` calls at runtime w/ the ` html`` ` tag or,
at build time with [`babel-plugin-htm`](https://github.com/developit/htm/tree/master/packages/babel-plugin-htm) (configure its `pragma` to `h`).

**JSX** needs to be transformed at build time first with [`babel-plugin-transform-jsx-to-htm`](https://github.com/developit/htm/tree/master/packages/babel-plugin-transform-jsx-to-htm) and after with [`babel-plugin-htm`](https://github.com/developit/htm/tree/master/packages/babel-plugin-htm).

**Counter Example (<!-- size:hello:start -->`~3.8kB`<!-- size:hello:end --> gzip) ([Codesandbox](https://codesandbox.io/s/sinuous-counter-z6k71))**

#### Tagged template (recommended)

```js
import { signal, html } from "cosuous";

const counter = signal(0);
const view = () => html` <div>Counter ${counter}</div> `;

document.body.append(view());
setInterval(() => counter(counter() + 1), 1000);
```

#### JSX

```jsx
import { h, signal } from "cosuous";

const counter = signal(0);
const view = () => <div>Counter {counter}</div>;

document.body.append(view());
setInterval(() => counter(counter() + 1), 1000);
```

#### Hyperscript

```js
import { h, signal } from "cosuous";

const counter = signal(0);
const view = () => h("div", "Counter ", counter);

document.body.append(view());
setInterval(() => counter(counter() + 1), 1000);
```

## Element refs

Capture the created DOM element by passing a `ref` callback in the props object. The callback fires synchronously with the new element, before it is inserted into the document. Useful for focus, measurement, or wiring up imperative libraries.

```js
import { html } from "cosuous";

let inputEl;
const view = () => html`<input ref=${(el) => (inputEl = el)} />`;

document.body.append(view());
inputEl.focus();
```

Works the same way with `h(...)` and JSX:

```jsx
<input ref={(el) => (inputEl = el)} />
```

## Reactivity

The Cosuous [`signal`](./src/signal.md) module provides a mechanism to store and update the application state in a reactive way. It is backed by [alien-signals](https://github.com/stackblitz/alien-signals).

_Anything that can be derived from the application state, should be derived. Automatically._

```js
import { signal, computed, effect } from "cosuous/signal";

const length = signal(0);
const squared = computed(() => Math.pow(length(), 2));

effect(() => console.log(squared()));
length(4); // => logs 16
```

## Hydration

Cosuous [`hydrate`](./src/hydrate.md) is a small add-on that provides fast hydration of static HTML. It's used for adding event listeners, adding dynamic attributes or content to existing DOM elements.

In terms of performance nothing beats statically generated HTML, both in serving and rendering on the client.

You could say using hydrate is a bit like using [jQuery](https://jquery.com/), you'll definitely write less JavaScript and do more. Additional benefits with Cosuous is that the syntax will be more _declarative_ and _reactivity_ is built-in.

```js
import { signal } from "cosuous";
import { hydrate, dhtml } from "cosuous/hydrate";

const isActive = signal("");

hydrate(
  dhtml`<a class="navbar-burger burger${isActive}"
    onclick=${() => isActive(isActive() ? "" : " is-active")} />`,
);

hydrate(dhtml`<a class="navbar-menu${isActive}" />`);
```

## Internal API

Cosuous exposes an internal API which can be overridden for fun and profit.
For example [sinuous-context](https://github.com/theSherwood/sinuous-context) uses it to implement a React like context API.

### Example

```js
import { api } from "cosuous";

const oldH = api.h;
api.h = (...args) => {
  console.log(args);
  return oldH(...args);
};
```

### Methods

These are defined in [cosuous/src](./src/index.ts) and [cosuous/h](./src/h.ts).

- `h(type: string, props: object | null, ...children: ElementChildren[]): HTMLElement | SVGElement`
- `hs(type: string, props: object | null, ...children: ElementChildren[]): SVGElement`
- `insert<T>(el: Node, value: T, endMark?: Node, current?: T | Frag, startNode?: Node): T | Frag`
- `property(el: Node, value: unknown, name: string, isAttr?: boolean, isCss?: boolean): void`
- `add(parent: Node, value: Value | Value[], endMark?: Node): Node | Frag`
- `rm(parent: Node, startNode: Node, endMark: Node): void`
- `effect(fn: () => void | (() => void)): () => void`
- `isSignal(value: unknown): boolean`
- `isComputed(value: unknown): boolean`

Note that _some_ signal methods are imported into the internal API from the bundled signal module because they're used in Cosuous' core. To access all signal methods, import from `cosuous/signal` directly.

## Concept

Sinuous (the project Cosuous is forked from) started as a little experiment to get similar behavior as [Surplus](https://github.com/adamhaile/surplus) but with template literals instead of JSX.
[HTM](https://github.com/developit/htm) compiles to an `h` tag. Adapted code from [Ryan Solid](https://github.com/ryansolid/babel-plugin-jsx-dom-expressions)'s dom expressions + a Reactive library provides the reactivity.

Cosuous returns a [hyperscript](https://github.com/hyperhype/hyperscript) function which is armed to handle the callback functions from the reactive library and updates the DOM accordingly.

## Contributors

Cosuous is a fork of [Sinuous](https://github.com/luwes/sinuous) by Wesley Luyten; thanks to him and everyone who contributed upstream. Contributions to Cosuous are welcome via [issues and pull requests](https://github.com/usagi-computer/cosuous).

<a href="https://github.com/usagi-computer/cosuous/graphs/contributors"><img src="https://contrib.rocks/image?repo=usagi-computer/cosuous" /></a>
