import { html, observable } from "cosuous";
import { _, d, dhtml, hydrate } from "cosuous/hydrate";
import { expect, test, vi } from "vitest";

test("hydrate component w/ children", () => {
  document.body.innerHTML = `
    <div id="wrap">
      <div>34</div>
      <div class="name">
        <span>Wes</span>
      </div>
    </div>
  `;

  const Wrap = (props, ...children) => {
    return dhtml`
      <div id=${props.id}>
        ${children}
      </div>
    `;
  };

  const Name = (props, ...children) => {
    return dhtml`
      <div class=${props.class}>
        ${children}
      </div>
    `;
  };

  const div = hydrate(dhtml`
    <${Wrap} id="wrap">
      <div class="age hidden">34</div>
      <${Name} class="name hidden">
        <span class="green">Wes</span>
      <//>
    <//>
  `);

  expect(div.id).toBe("wrap");
  expect(div.children[0].className).toBe("age hidden");
  expect(div.children[1].className).toBe("name hidden");
  expect(div.children[1].children[0].className).toBe("green");
});

test("hydrates div with children", () => {
  const delta = dhtml`<div>${[dhtml`<b />`]}</div>`;
  delete delta._children[0]._parent;

  expect(delta).toEqual({ type: "div", _children: [{ type: "b", _children: [] }] });
});

test("hydrates root bug", () => {
  document.body.innerHTML = `
    <img class="hidden" />
  `;

  const img = hydrate(
    dhtml`
    <img class="hidden block" />
  `,
    document.querySelector("img"),
  );

  expect(img.className).toBe("hidden block");
});

test("hydrate function undefined bug", () => {
  document.body.innerHTML = `
    <div class="navbar-item">
      <a>...</a>
    </div>
  `;

  const div = hydrate(dhtml`
    <div class="navbar-item">
      <a>${() => undefined}</a>
    </div>
  `);

  expect(div.querySelector("a").textContent).toBe("...");
});

test("hydrate function bug", () => {
  document.body.innerHTML = `
    <div class="navbar-item">
      <a>...</a>
    </div>
  `;

  const div = hydrate(dhtml`
    <div class="navbar-item">
      <a>${() => "Wesley"}</a>
    </div>
  `);

  expect(div.querySelector("a").textContent).toBe("Wesley");
});

test("add insert into empty node feature", () => {
  document.body.innerHTML = `
    <div class="navbar-item">
      <a></a>
    </div>
  `;

  const div = hydrate(dhtml`
    <div class="navbar-item">
      <a>${() => "Wesley"}</a>
    </div>
  `);

  expect(div.querySelector("a").textContent).toBe("Wesley");
});

test("hydrate conditional root element", () => {
  document.body.innerHTML = `<player-x></player-x>`;

  const showing = observable(true);

  var player = hydrate(dhtml`
    ${() => (player = showing() ? dhtml`<player-x autoplay />` : "")}
  `);

  expect(player.tagName).toBe("PLAYER-X");
  expect(player.autoplay).toBe(true);

  showing(false);
  expect(player).toBe("");
  expect(document.body.innerHTML).toBe("");

  showing(true);
  expect(player.tagName).toBe("PLAYER-X");
  expect(document.body.innerHTML).toBe("<player-x></player-x>");
});

test("hydrate conditional root element w/ explicit selector", () => {
  document.body.innerHTML = `<player-x></player-x>`;

  const showing = observable(true);

  var player = hydrate(
    dhtml`
    ${() => (player = showing() ? dhtml`<player-x autoplay />` : "")}
  `,
    document.querySelector("player-x"),
  );

  expect(player.tagName).toBe("PLAYER-X");
  expect(player.autoplay).toBe(true);

  showing(false);
  expect(player).toBe("");
  expect(document.body.innerHTML).toBe("");

  showing(true);
  expect(player.tagName).toBe("PLAYER-X");
  expect(document.body.innerHTML).toBe("<player-x></player-x>");
});

test("hydrate conditional root element w/ children bug", () => {
  document.body.innerHTML = `<player-x><div></div></player-x>`;

  const showing = observable(true);

  var player = hydrate(dhtml`
    ${() =>
      (player = showing()
        ? dhtml`
      <player-x autoplay>
        <div />
      <//>
    `
        : "")}
  `);

  expect(player.tagName).toBe("PLAYER-X");
  expect(player.autoplay).toBe(true);

  showing(false);
  expect(player).toBe("");
  expect(document.body.innerHTML).toBe("");

  showing(true);
  expect(player.tagName).toBe("PLAYER-X");
  expect(document.body.innerHTML).toBe("<player-x><div></div></player-x>");
});

test("hydrate w/ observables bug", () => {
  document.body.innerHTML = `
    <div class="box level">
      <div class="level-item">
        <button class="button">-</button>
      </div>
      <div class="level-item">
        <h1 class="title">0</h1>
      </div>
      <div class="level-item">
        <button class="button">+</button>
      </div>
    </div>
  `;

  const count = observable(0);
  const down = vi.fn();
  down.mockImplementation(() => count(count() - 1));
  const up = vi.fn();
  up.mockImplementation(() => count(count() + 1));

  const delta = dhtml`
    <div class="box level">
      <div class="level-item">
        <button class="button" onclick="${down}">
          -
        </button>
      </div>
      <div class="level-item">
        <h1 class="title">${count}</h1>
      </div>
      <div class="level-item">
        <button class="button" onclick="${up}">
          +
        </button>
      </div>
    </div>
  `;

  const box = hydrate(delta, document.querySelector(".box"));

  box.querySelectorAll(".button")[0].click();
  expect(down.mock.calls.length).toBe(1);

  expect(box.querySelector("h1").textContent).toBe("-1");
});

test("hydrate adds event listeners", () => {
  document.body.innerHTML = `
    <div>
      <button>something</button>
    </div>
  `;

  const click = vi.fn();
  const delta = d("div", [d("button", { onclick: click, title: "Apply pressure" }, "something")]);
  const div = hydrate(delta, document.querySelector("div"));
  const btn = div.children[0];
  btn.click();
  expect(click.mock.calls.length).toBe(1);

  div.parentNode.removeChild(div);
});

test("hydrate works with nested children and patches text", () => {
  document.body.innerHTML = `
    <div class="container">
      <h1>Banana</h1>
      <div class="main">
        <button>Cherry</button>
        Text node
      </div>
    </div>
  `;

  const delta = dhtml`
    <div class="container">
      <h1>Banana milkshake</h1>
      <div class="main">
        <button>Cherry</button>
        Text node patch
      </div>
    </div>
  `;

  const div = hydrate(delta, document.querySelector("div"));

  expect(div.outerHTML).toBe(`<div class="container">
      <h1>Banana milkshake</h1>
      <div class="main">
        <button>Cherry</button>Text node patch</div>
    </div>`);

  div.parentNode.removeChild(div);
});

test("hydrate can add observables", () => {
  document.body.innerHTML = `
    <div>
      0
      <button>off</button>
      0
    </div>
  `;

  const count = observable(0);
  const toggle = observable("off");
  const delta = d("div", [count, d("button", { class: "toggle" }, toggle), count]);
  const div = hydrate(delta, document.querySelector("div"));
  count(1);

  expect(div.outerHTML).toBe(`<div>1<button class="toggle">off</button>1</div>`);

  count(22);
  toggle("on");

  expect(div.outerHTML).toBe(`<div>22<button class="toggle">on</button>22</div>`);

  div.parentNode.removeChild(div);
});

test("hydrate can add conditional observables in tags", () => {
  document.body.innerHTML = `
    <div class="hamburger">
      <span>Pickle</span>
      <span>Ketchup</span>
      <span>Cheese</span>
      <span>Ham</span>
    </div>
  `;

  const sauce = observable("");
  const delta = dhtml`
    <div class="hamburger">
      <span>Pickle</span>
      <span>${() => (sauce() === "mayo" ? "Mayo" : "Ketchup")}</span>
      <span>Cheese</span>
      <span>Ham</span>
    </div>
  `;
  const div = hydrate(delta, document.querySelector("div"));

  expect(div.outerHTML).toBe(`<div class="hamburger">
      <span>Pickle</span>
      <span>Ketchup</span>
      <span>Cheese</span>
      <span>Ham</span>
    </div>`);

  sauce("mayo");

  expect(div.outerHTML).toBe(`<div class="hamburger">
      <span>Pickle</span>
      <span>Mayo</span>
      <span>Cheese</span>
      <span>Ham</span>
    </div>`);

  div.parentNode.removeChild(div);
});

test("hydrate works with a placeholder character", () => {
  document.body.innerHTML = `
    <div class="container">
      <h1>Banana</h1>
      <div class="main">
        <button>Cherry</button>
        Text node
        <button class="btn">Bom</button>
      </div>
    </div>
  `;

  const click = vi.fn();
  const delta = dhtml`
    <div>
      <h1>${_}</h1>
      <div>
        <button>${_}</button>
        ${_}
        <button class="btn" onclick=${click}>Bom</button>
      </div>
    </div>
  `;
  const div = hydrate(delta, document.querySelector("div"));
  const btn = div.querySelector(".btn");
  btn.click();
  expect(click.mock.calls.length).toBe(1);

  expect(div.outerHTML).toBe(`<div class="container">
      <h1>Banana</h1>
      <div class="main">
        <button>Cherry</button>
        Text node
        <button class="btn">Bom</button>
      </div>
    </div>`);

  div.parentNode.removeChild(div);
});

test("hydrate can add a node from function", () => {
  document.body.innerHTML = `
    <div>
      <span>Pear</span>
    </div>
  `;

  const fruit = observable("Pear");
  const delta = dhtml`
    <div>
      ${() => dhtml`<span>${fruit}</span>`}
    </div>
  `;
  const div = hydrate(delta, document.querySelector("div"));

  expect(div.outerHTML).toBe(`<div>
      <span>Pear</span>
    </div>`);

  fruit("Apple");

  expect(div.outerHTML).toBe(`<div>
      <span>Apple</span>
    </div>`);

  div.parentNode.removeChild(div);
});

test("hydrate can add a fragment from function", () => {
  document.body.innerHTML = `
    <div>
      <span>Pear</span>
      <span>Banana</span>
      <span>Tomato</span>
    </div>
  `;

  const fruit = observable("Pear");
  const veggie = observable("Tomato");
  const delta = dhtml`
    <div>
      ${() => dhtml`
        <span>${fruit}</span>
        <span>Banana</span>
        ${() => dhtml`<span>${veggie}</span>`}
      `}
    </div>
  `;
  const div = hydrate(delta, document.querySelector("div"));

  expect(div.outerHTML).toBe(`<div>
      <span>Pear</span>
      <span>Banana</span>
      <span>Tomato</span>
    </div>`);

  fruit("Apple");
  veggie("Potato");

  expect(div.outerHTML).toBe(`<div>
      <span>Apple</span>
      <span>Banana</span>
      <span>Potato</span>
    </div>`);

  div.parentNode.removeChild(div);
});

test("hydrates adjacent text nodes", () => {
  document.body.innerHTML = `
    <div>Hi John Snow<span>!</span></div>
  `;

  const greeting = observable("Hi");
  const name = observable("John Snow");
  const delta = dhtml`
    <div>${greeting} ${name}<span>!</span></div>
  `;
  const div = hydrate(delta, document.querySelector("div"));

  expect(div.outerHTML).toBe(`<div>Hi John Snow<span>!</span></div>`);

  name("Wesley Luyten");

  expect(div.outerHTML).toBe(`<div>Hi Wesley Luyten<span>!</span></div>`);

  div.parentNode.removeChild(div);
});

test("hydrate can add conditional observables in content", () => {
  document.body.innerHTML = `
    <div class="hamburger">Pickle Ketchup Cheese Ham</div>
  `;

  const sauce = observable("");
  const delta = dhtml`
    <div class="hamburger">
      Pickle ${() => (sauce() === "mayo" ? "Mayo" : "Ketchup")} Cheese Ham
    </div>
  `;
  const div = hydrate(delta, document.querySelector("div"));

  expect(div.outerHTML).toBe(`<div class="hamburger">Pickle Ketchup Cheese Ham</div>`);

  sauce("mayo");

  expect(div.outerHTML).toBe(`<div class="hamburger">Pickle Mayo Cheese Ham</div>`);

  div.parentNode.removeChild(div);
});

test("hydrate can add conditional observables in content w/ newlines", () => {
  document.body.innerHTML = `
    <div class="hamburger">
      Pickle
      Ketchup
      Cheese
      Ham
    </div>
  `;

  const sauce = observable("");
  const delta = dhtml`
    <div class="hamburger">
      Pickle
      ${() => (sauce() === "mayo" ? "Mayo" : "Ketchup")}
      Cheese
      Ham
    </div>
  `;
  const div = hydrate(delta, document.querySelector("div"));

  expect(div.outerHTML).toBe(`<div class="hamburger">
      Pickle
      Ketchup
      Cheese
      Ham
    </div>`);

  sauce("mayo");

  expect(div.outerHTML).toBe(`<div class="hamburger">
      Pickle
      Mayo
      Cheese
      Ham
    </div>`);

  div.parentNode.removeChild(div);
});

test("hydrate can create dom after hydration", () => {
  document.body.innerHTML = `
    <button>
      ...
    </button>
  `;

  const avatar = observable("W");

  const button = hydrate(
    dhtml`
    <button>
      ${avatar}
    </button>
  `,
    document.querySelector("button"),
  );

  expect(button.childNodes[0].textContent).toBe("W");

  avatar(html`
    W
    <img class="hidden" src="https://sinuous.io/" />
  `);

  expect(button.childNodes[2].src).toBe("https://sinuous.io/");
});

test("hydrate components", () => {
  document.body.innerHTML = `
    <div id="wrap">
      <div class="name">
        <span>Wes</span>
      </div>
    </div>
  `;

  const name = observable("Wes");

  const Name = (props) => {
    return dhtml`
      <div class="name hidden">
        <span>${props.text}</span>
      </div>
    `;
  };

  const div = hydrate(dhtml`
    <div id="wrap">
      <${Name} text=${name} />
    </div>
  `);

  expect(div.children[0].className).toBe("name hidden");
  expect(div.children[0].children[0].textContent).toBe("Wes");

  name("Joe");

  expect(div.children[0].children[0].textContent).toBe("Joe");
});

test("hydrate root component", () => {
  document.body.innerHTML = `
    <div class="name">
      <span>Wes</span>
    </div>
  `;

  const name = observable("Wes");

  const Name = (props) => {
    return dhtml`
      <div class="name">
        <span>${props.text}</span>
      </div>
    `;
  };

  const div = hydrate(dhtml`
    <${Name} text=${name} />
  `);

  expect(div.className).toBe("name");
  expect(div.children[0].textContent).toBe("Wes");

  name("Joe");

  expect(div.children[0].textContent).toBe("Joe");
});
