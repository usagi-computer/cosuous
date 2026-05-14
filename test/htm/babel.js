import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { transform } from "@babel/core";
import { describe, test, expect } from "vitest";

import htmBabelPlugin from "../../src/babel-plugin-htm.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const options = {
  babelrc: false,
  configFile: false,
  sourceType: "script",
  compact: true,
};

describe("htm/babel", () => {
  test("basic transformation", () => {
    expect(
      transform("html`<div id=hello>hello</div>`;", {
        ...options,
        plugins: [htmBabelPlugin],
      }).code,
    ).toBe(`h("div",{id:"hello"},"hello");`);
  });

  test("basic transformation with variable", () => {
    expect(
      transform('var name="world";html`<div id=hello>hello, ${name}</div>`;', {
        ...options,
        plugins: [htmBabelPlugin],
      }).code,
    ).toBe(`var name="world";h("div",{id:"hello"},"hello, ",name);`);
  });

  test("basic nested transformation", () => {
    expect(
      transform("html`<a b=${2} ...${{ c: 3 }}>d: ${4}</a>`;", {
        ...options,
        plugins: [
          [
            htmBabelPlugin,
            {
              useBuiltIns: true,
            },
          ],
        ],
      }).code,
    ).toBe(`h("a",Object.assign({b:2},{c:3}),"d: ",4);`);

    expect(
      transform("html`<a b=${2} ...${{ c: 3 }}>d: ${4}</a>`;", {
        ...options,
        plugins: [
          [
            htmBabelPlugin,
            {
              useNativeSpread: true,
            },
          ],
        ],
      }).code,
    ).toBe(`h("a",{b:2,...{c:3}},"d: ",4);`);
  });

  test("spread a single variable", () => {
    expect(
      transform("html`<a ...${foo}></a>`;", {
        ...options,
        plugins: [htmBabelPlugin],
      }).code,
    ).toBe(`h("a",foo);`);

    expect(
      transform("html`<a ...${foo}></a>`;", {
        ...options,
        plugins: [
          [
            htmBabelPlugin,
            {
              useNativeSpread: true,
            },
          ],
        ],
      }).code,
    ).toBe(`h("a",foo);`);
  });

  test("spread two variables", () => {
    expect(
      transform("html`<a ...${foo} ...${bar}></a>`;", {
        ...options,
        plugins: [
          [
            htmBabelPlugin,
            {
              useBuiltIns: true,
            },
          ],
        ],
      }).code,
    ).toBe(`h("a",Object.assign({},foo,bar));`);

    expect(
      transform("html`<a ...${foo} ...${bar}></a>`;", {
        ...options,
        plugins: [
          [
            htmBabelPlugin,
            {
              useNativeSpread: true,
            },
          ],
        ],
      }).code,
    ).toBe(`h("a",{...foo,...bar});`);
  });

  test("property followed by a spread", () => {
    expect(
      transform('html`<a b="1" ...${foo}></a>`;', {
        ...options,
        plugins: [
          [
            htmBabelPlugin,
            {
              useBuiltIns: true,
            },
          ],
        ],
      }).code,
    ).toBe(`h("a",Object.assign({b:"1"},foo));`);

    expect(
      transform('html`<a b="1" ...${foo}></a>`;', {
        ...options,
        plugins: [
          [
            htmBabelPlugin,
            {
              useNativeSpread: true,
            },
          ],
        ],
      }).code,
    ).toBe(`h("a",{b:"1",...foo});`);
  });

  test("spread followed by a property", () => {
    expect(
      transform('html`<a ...${foo} b="1"></a>`;', {
        ...options,
        plugins: [
          [
            htmBabelPlugin,
            {
              useBuiltIns: true,
            },
          ],
        ],
      }).code,
    ).toBe(`h("a",Object.assign({},foo,{b:"1"}));`);

    expect(
      transform('html`<a ...${foo} b="1"></a>`;', {
        ...options,
        plugins: [
          [
            htmBabelPlugin,
            {
              useNativeSpread: true,
            },
          ],
        ],
      }).code,
    ).toBe(`h("a",{...foo,b:"1"});`);
  });

  test("mix-and-match spreads", () => {
    expect(
      transform('html`<a b="1" ...${foo} c=${2} ...${{d:3}}></a>`;', {
        ...options,
        plugins: [
          [
            htmBabelPlugin,
            {
              useBuiltIns: true,
            },
          ],
        ],
      }).code,
    ).toBe(`h("a",Object.assign({b:"1"},foo,{c:2},{d:3}));`);

    expect(
      transform('html`<a b="1" ...${foo} c=${2} ...${{d:3}}></a>`;', {
        ...options,
        plugins: [
          [
            htmBabelPlugin,
            {
              useNativeSpread: true,
            },
          ],
        ],
      }).code,
    ).toBe(`h("a",{b:"1",...foo,c:2,...{d:3}});`);
  });

  test("mix-and-match dynamic and static values", () => {
    expect(
      transform('html`<a b="1${2}${3}"></a>`;', {
        ...options,
        plugins: [
          [
            htmBabelPlugin,
            {
              useBuiltIns: true,
            },
          ],
        ],
      }).code,
    ).toBe(`h("a",{b:"1"+2+3});`);

    expect(
      transform('html`<a b="1${2}${3}"></a>`;', {
        ...options,
        plugins: [
          [
            htmBabelPlugin,
            {
              useNativeSpread: true,
            },
          ],
        ],
      }).code,
    ).toBe(`h("a",{b:"1"+2+3});`);
  });

  test("coerces props to strings when needed", () => {
    expect(
      transform("html`<a b='${1}${2}${\"3\"}${4}'></a>`;", {
        ...options,
        plugins: [
          [
            htmBabelPlugin,
            {
              useBuiltIns: true,
            },
          ],
        ],
      }).code,
    ).toBe(`h("a",{b:""+1+2+"3"+4});`);

    expect(
      transform("html`<a b='${1}${2}${\"3\"}${4}'></a>`;", {
        ...options,
        plugins: [
          [
            htmBabelPlugin,
            {
              useNativeSpread: true,
            },
          ],
        ],
      }).code,
    ).toBe(`h("a",{b:""+1+2+"3"+4});`);
  });

  test("coerces props to strings only when needed", () => {
    expect(
      transform('html`<a b=\'${"1"}${2}${"3"}${4}\'></a>`;', {
        ...options,
        plugins: [
          [
            htmBabelPlugin,
            {
              useBuiltIns: true,
            },
          ],
        ],
      }).code,
    ).toBe(`h("a",{b:"1"+2+"3"+4});`);

    expect(
      transform('html`<a b=\'${"1"}${2}${"3"}${4}\'></a>`;', {
        ...options,
        plugins: [
          [
            htmBabelPlugin,
            {
              useNativeSpread: true,
            },
          ],
        ],
      }).code,
    ).toBe(`h("a",{b:"1"+2+"3"+4});`);
  });

  test("should add children without closure", () => {
    expect(
      transform("html`<div><b /></div>`;", {
        ...options,
        plugins: [[htmBabelPlugin]],
      }).code,
    ).toBe(`h("div",null,h("b",null));`);
    expect(
      transform("html`<div><b /><i /></div>`;", {
        ...options,
        plugins: [[htmBabelPlugin]],
      }).code,
    ).toBe(`h("div",null,h("b",null),h("i",null));`);
  });

  test("should wrap children of component in closure", () => {
    expect(
      transform("html`<${Component}><div></div><//>`;", {
        ...options,
        plugins: [[htmBabelPlugin]],
      }).code,
    ).toBe(`h(Component,null,()=>h("div",null));`);
    expect(
      transform("html`<${Component}><div /><b /><//>`;", {
        ...options,
        plugins: [[htmBabelPlugin]],
      }).code,
    ).toBe(`h(Component,null,()=>h("div",null),()=>h("b",null));`);
    expect(
      transform("html`<${Component}><div><${Component}><b /><//></div><//>`;", {
        ...options,
        plugins: [[htmBabelPlugin]],
      }).code,
    ).toBe(`h(Component,null,()=>h("div",null,h(Component,null,()=>h("b",null))));`);
  });

  describe("{variableArity:false}", () => {
    test("should pass no children as an empty Array", () => {
      expect(
        transform("html`<div />`;", {
          ...options,
          plugins: [
            [
              htmBabelPlugin,
              {
                variableArity: false,
              },
            ],
          ],
        }).code,
      ).toBe(`h("div",null,[]);`);
    });

    test("should pass children as an Array", () => {
      expect(
        transform("html`<div id=hello>hello</div>`;", {
          ...options,
          plugins: [
            [
              htmBabelPlugin,
              {
                variableArity: false,
              },
            ],
          ],
        }).code,
      ).toBe(`h("div",{id:"hello"},["hello"]);`);
    });
  });

  describe("{pragma:false}", () => {
    test("should transform to inline vnodes", () => {
      expect(
        transform('var name="world",vnode=html`<div id=hello>hello, ${name}</div>`;', {
          ...options,
          plugins: [
            [
              htmBabelPlugin,
              {
                pragma: false,
              },
            ],
          ],
        }).code,
      ).toBe(`var name="world",vnode={tag:"div",props:{id:"hello"},children:["hello, ",name]};`);
    });
  });

  describe("{monomorphic:true}", () => {
    test("should transform to monomorphic inline vnodes", () => {
      expect(
        transform('var name="world",vnode=html`<div id=hello>hello, ${name}</div>`;', {
          ...options,
          plugins: [
            [
              htmBabelPlugin,
              {
                monomorphic: true,
              },
            ],
          ],
        }).code,
      ).toBe(
        `var name="world",vnode={type:1,tag:"div",props:{id:"hello"},children:[{type:3,tag:null,props:null,children:null,text:"hello, "},name],text:null};`,
      );
    });
  });

  describe('{import:"preact"}', () => {
    test("should do nothing when pragma=false", () => {
      expect(
        transform('var name="world",vnode=html`<div id=hello>hello, ${name}</div>`;', {
          ...options,
          plugins: [
            [
              htmBabelPlugin,
              {
                pragma: false,
                import: "preact",
              },
            ],
          ],
        }).code,
      ).toBe(`var name="world",vnode={tag:"div",props:{id:"hello"},children:["hello, ",name]};`);
    });
    test("should do nothing when tag is not used", () => {
      expect(
        transform('console.log("hi");', {
          ...options,
          plugins: [
            [
              htmBabelPlugin,
              {
                import: "preact",
              },
            ],
          ],
        }).code,
      ).toBe(`console.log("hi");`);
    });
    test("should add import", () => {
      expect(
        transform("html`<div id=hello>hello</div>`;", {
          ...options,
          plugins: [
            [
              htmBabelPlugin,
              {
                import: "preact",
              },
            ],
          ],
        }).code,
      ).toBe(`import{h}from"preact";h("div",{id:"hello"},"hello");`);
    });
    test("should add import for pragma", () => {
      expect(
        transform("html`<div id=hello>hello</div>`;", {
          ...options,
          plugins: [
            [
              htmBabelPlugin,
              {
                pragma: "createElement",
                import: "react",
              },
            ],
          ],
        }).code,
      ).toBe(`import{createElement}from"react";createElement("div",{id:"hello"},"hello");`);
    });
  });

  describe("{import:Object}", () => {
    test("should add import", () => {
      expect(
        transform("html`<div id=hello>hello</div>`;", {
          ...options,
          plugins: [
            [
              htmBabelPlugin,
              {
                import: {
                  module: "preact",
                  export: "h",
                },
              },
            ],
          ],
        }).code,
      ).toBe(`import{h}from"preact";h("div",{id:"hello"},"hello");`);
    });
    test("should add import as pragma", () => {
      expect(
        transform("html`<div id=hello>hello</div>`;", {
          ...options,
          plugins: [
            [
              htmBabelPlugin,
              {
                pragma: "hh",
                import: {
                  module: "preact",
                  export: "h",
                },
              },
            ],
          ],
        }).code,
      ).toBe(`import{h as hh}from"preact";hh("div",{id:"hello"},"hello");`);
    });
    test("should add import default", () => {
      expect(
        transform("html`<div id=hello>hello</div>`;", {
          ...options,
          plugins: [
            [
              htmBabelPlugin,
              {
                pragma: "React.createElement",
                import: {
                  module: "react",
                  export: "default",
                },
              },
            ],
          ],
        }).code,
      ).toBe(`import React from"react";React.createElement("div",{id:"hello"},"hello");`);
    });
    test("should add import *", () => {
      expect(
        transform("html`<div id=hello>hello</div>`;", {
          ...options,
          plugins: [
            [
              htmBabelPlugin,
              {
                pragma: "Preact.h",
                import: {
                  module: "preact",
                  export: "*",
                },
              },
            ],
          ],
        }).code,
      ).toBe(`import*as Preact from"preact";Preact.h("div",{id:"hello"},"hello");`);
    });
  });

  describe('{wrapExpressions:"h.wrap"}', () => {
    test("should transform to a wrapped expression", () => {
      expect(
        transform('var name="world";html`<div id=hello>hello, ${name}</div>`;', {
          ...options,
          plugins: [
            [
              htmBabelPlugin,
              {
                wrapExpression: "h.wrap",
              },
            ],
          ],
        }).code,
      ).toBe(
        `var name="world";h.wrap.apply((_statics,_field)=>h("div",{id:"hello"},"hello, ",_field),[["<div id=hello>hello, ","</div>"],name]);`,
      );
    });

    test("should transform to a wrapped expression nested", () => {
      expect(
        transform('var name="world";html`<div id=hello>hello, ${html`<h1>${name}</h1>`}</div>`;', {
          ...options,
          plugins: [
            [
              htmBabelPlugin,
              {
                wrapExpression: "h.wrap",
              },
            ],
          ],
        }).code,
      ).toBe(
        `var name="world";h.wrap.apply((_statics,_field)=>h("div",{id:"hello"},"hello, ",_field),[["<div id=hello>hello, ","</div>"],h.wrap.apply((_statics2,_field2)=>h("h1",null,_field2),[["<h1>","</h1>"],name])]);`,
      );
    });
  });

  describe("main test suite", () => {
    // Run all of the main tests against the Babel plugin:
    // Read index.js, strip its vitest/htm imports, transform with the plugin,
    // then eval the result inside this describe block so its `test(...)` and
    // `expect(...)` calls register against the current vitest context.
    const mod = fs.readFileSync(path.resolve(__dirname, "index.js"), "utf8").replace(/\\0/g, "\0");
    const stripped = mod
      .replace(/^\s*import\s*\{\s*test\s*,\s*expect\s*\}\s*from\s*['"]vitest['"]\s*;?\s*$/m, "")
      .replace(/^\s*import\s+htm\s+from\s+(['"]).*?\1[\s;]*$/im, "const htm = function(){};");
    const { code } = transform(stripped, {
      ...options,
      plugins: [htmBabelPlugin],
    });
    // eslint-disable-next-line no-new-func
    new Function("test", "expect", code)(test, expect);
  });
});
