# Cosuous

A light, fast, reactive UI library. A fork of [Sinuous](https://github.com/luwes/sinuous) by Wesley Luyten.

[![Version](https://img.shields.io/npm/v/cosuous.svg?color=success&style=flat-square)](https://www.npmjs.com/package/cosuous)

**npm**: `npm i cosuous`  
**cdn**: https://cdn.jsdelivr.net/npm/cosuous/+esm

- **Small.** hello world at `~1.4kB` gzip.
- **Fast.** [top ranked](https://rawgit.com/krausest/js-framework-benchmark/master/webdriver-ts-results/table.html) of 80+ UI libs.
- **Truly reactive.** automatically derived from the app state.
- **DevEx.** no compile step needed, choose your [view syntax](#view-syntax).

### Add-ons

| Size | Name                                        | Description                             |
| ---- | ------------------------------------------- | --------------------------------------- |
| -    | [`cosuous/observable`](./src/observable.md) | Tiny observable _(included by default)_ |
| -    | [`cosuous/map`](./src/map.js)               | Fast list renderer                      |
| -    | [`cosuous/hydrate`](./src/hydrate.md)       | Hydrate static HTML                     |
| -    | [`cosuous/template`](./src/template.md)     | Pre-rendered Template                   |

### Community

- [**sinuous-context**](https://github.com/theSherwood/sinuous-context) ([@theSherwood](https://github.com/theSherwood)): A light-weight, fast, and easy to use context api for Sinuous.
- [**memo**](https://github.com/luwes/memo) ([@luwes](https://github.com/luwes)): Memoize components and functions.
- [**disco**](https://github.com/luwes/disco) ([@luwes](https://github.com/luwes)): Universal `connected` and `disconnected` lifecycle events.
- [**sinuous-style**](https://github.com/theSherwood/sinuous-style) ([@theSherwood](https://github.com/theSherwood)): Scoped styles for Sinuous à la styled-jsx.
- [**sinuous-lifecycle**](https://www.npmjs.com/package/sinuous-lifecycle) ([@heyheyhello](https://github.com/heyheyhello)): onAttach/onDetach DOM lifecycles.
- [**sinuous-trace**](https://www.npmjs.com/package/sinuous-trace) ([@heyheyhello](https://github.com/heyheyhello)): Traces the internal API to record component creation, adoption, and removal.

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
at build time with [`cosuous/babel-plugin-htm`](./src/babel-plugin-htm.js).

**JSX** needs to be transformed at build time first with [`babel-plugin-transform-jsx-to-htm`](https://github.com/developit/htm/tree/master/packages/babel-plugin-transform-jsx-to-htm) and after with [`cosuous/babel-plugin-htm`](./src/babel-plugin-htm.js).

**Counter Example (_1.4kB gzip_) ([Codesandbox](https://codesandbox.io/s/sinuous-counter-z6k71))**

#### Tagged template (recommended)

```js
import { observable, html } from "cosuous";

const counter = observable(0);
const view = () => html` <div>Counter ${counter}</div> `;

document.body.append(view());
setInterval(() => counter(counter() + 1), 1000);
```

#### JSX

```jsx
import { h, observable } from "cosuous";

const counter = observable(0);
const view = () => <div>Counter {counter}</div>;

document.body.append(view());
setInterval(() => counter(counter() + 1), 1000);
```

#### Hyperscript

```js
import { h, observable } from "cosuous";

const counter = observable(0);
const view = () => h("div", "Counter ", counter);

document.body.append(view());
setInterval(() => counter(counter() + 1), 1000);
```

## Reactivity

The Cosuous [`observable`](./src/observable.md) module provides a mechanism to store and update the application state in a reactive way. If you're familiar with [S.js](https://github.com/adamhaile/S) or [Mobx](https://mobx.js.org) some functions will look very familiar, in under `1kB` Cosuous observable is not as extensive but offers a distilled version of the same functionality. It works under this philosophy:

_Anything that can be derived from the application state, should be derived. Automatically._

```js
import { observable, computed, subscribe } from "cosuous/observable";

const length = observable(0);
const squared = computed(() => Math.pow(length(), 2));

subscribe(() => console.log(squared()));
length(4); // => logs 16
```

#### Use a custom reactive library

Cosuous can work with different observable libraries; S.js, MobX, hyperactiv.
See the upstream [Sinuous wiki](https://github.com/luwes/sinuous/wiki/Choose-your-own-reactive-library) for more info.

## Hydration

Cosuous [`hydrate`](./src/hydrate.md) is a small add-on that provides fast hydration of static HTML. It's used for adding event listeners, adding dynamic attributes or content to existing DOM elements.

In terms of performance nothing beats statically generated HTML, both in serving and rendering on the client.

You could say using hydrate is a bit like using [jQuery](https://jquery.com/), you'll definitely write less JavaScript and do more. Additional benefits with Cosuous is that the syntax will be more _declarative_ and _reactivity_ is built-in.

```js
import { observable } from "cosuous";
import { hydrate, dhtml } from "cosuous/hydrate";

const isActive = observable("");

hydrate(
  dhtml`<a class="navbar-burger burger${isActive}"
    onclick=${() => isActive(isActive() ? "" : " is-active")} />`,
);

hydrate(dhtml`<a class="navbar-menu${isActive}" />`);
```

## Internal API

Cosuous exposes an internal API which can be overridden for fun and profit.
For example [sinuous-context](https://github.com/theSherwood/sinuous-context) uses it to implement a React like context API.

As of `0.27.4` (Sinuous) the internal API should be used to make Cosuous work with a 3rd party reactive library like [Mobx](https://mobx.js.org). This can be done by overriding `subscribe`, `root`, `sample` and `cleanup`.

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

These are defined in [cosuous/src](./src/index.js) and [cosuous/h](./src/h.js).

- `h(type: string, props: object, ...children)`
- `hs(type: string, props: object, ...children)`
- `insert<T>(el: Node, value: T, endMark?: Node, current?: T | Frag, startNode?: Node): T | Frag;`
- `property(el: Node, value: unknown, name: string, isAttr?: boolean, isCss?: boolean): void;`
- `add(parent: Node, value: Value | Value[], endMark?: Node): Node | Frag;`
- `rm(parent: Node, startNode: Node, endMark: Node): void;`
- `subscribe<T>(observer: () => T): () => void;`
- `root<T>(fn: () => T): T;`
- `sample<T>(fn: () => T): T;`
- `cleanup<T extends () => unknown>(fn: T): T;`

Note that _some_ observable methods are imported into the internal API from the bundled observable module because they're used in Cosuous' core. To access all observable methods, import from `cosuous/observable` directly.

## Concept

Sinuous (the project Cosuous is forked from) started as a little experiment to get similar behavior as [Surplus](https://github.com/adamhaile/surplus) but with template literals instead of JSX.
[HTM](https://github.com/developit/htm) compiles to an `h` tag. Adapted code from [Ryan Solid](https://github.com/ryansolid/babel-plugin-jsx-dom-expressions)'s dom expressions + a Reactive library provides the reactivity.

Cosuous returns a [hyperscript](https://github.com/hyperhype/hyperscript) function which is armed to handle the callback functions from the reactive library and updates the DOM accordingly.

## Contributors

### Code Contributors

This project exists thanks to all the people who contribute. [[Contribute](CONTRIBUTING.md)].
<a href="https://github.com/luwes/sinuous/graphs/contributors"><img src="https://opencollective.com/sinuous/contributors.svg?width=890&button=false" /></a>

### Financial Contributors

Become a financial contributor and help us sustain our community. [[Contribute](https://opencollective.com/sinuous/contribute)]

#### Individuals

<a href="https://opencollective.com/sinuous"><img src="https://opencollective.com/sinuous/individuals.svg?width=890"></a>

#### Organizations

Support this project with your organization. Your logo will show up here with a link to your website. [[Contribute](https://opencollective.com/sinuous/contribute)]

<a href="https://opencollective.com/sinuous/organization/0/website"><img src="https://opencollective.com/sinuous/organization/0/avatar.svg"></a>
<a href="https://opencollective.com/sinuous/organization/1/website"><img src="https://opencollective.com/sinuous/organization/1/avatar.svg"></a>
<a href="https://opencollective.com/sinuous/organization/2/website"><img src="https://opencollective.com/sinuous/organization/2/avatar.svg"></a>
<a href="https://opencollective.com/sinuous/organization/3/website"><img src="https://opencollective.com/sinuous/organization/3/avatar.svg"></a>
<a href="https://opencollective.com/sinuous/organization/4/website"><img src="https://opencollective.com/sinuous/organization/4/avatar.svg"></a>
<a href="https://opencollective.com/sinuous/organization/5/website"><img src="https://opencollective.com/sinuous/organization/5/avatar.svg"></a>
<a href="https://opencollective.com/sinuous/organization/6/website"><img src="https://opencollective.com/sinuous/organization/6/avatar.svg"></a>
<a href="https://opencollective.com/sinuous/organization/7/website"><img src="https://opencollective.com/sinuous/organization/7/avatar.svg"></a>
<a href="https://opencollective.com/sinuous/organization/8/website"><img src="https://opencollective.com/sinuous/organization/8/avatar.svg"></a>
<a href="https://opencollective.com/sinuous/organization/9/website"><img src="https://opencollective.com/sinuous/organization/9/avatar.svg"></a>
