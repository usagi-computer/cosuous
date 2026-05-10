import { test, expect } from "vitest";
import { hs, svg } from "cosuous";
import { normalizeSvg } from "../../test/_utils.js";

test("normalizeSvg", () => {
  // IE11 adds xmlns and has a self closing tags.
  expect(
    normalizeSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" class="redbox" viewBox="0 0 100 100"><path d="M 8.74211 7.70899" /></svg>',
    ),
  ).toBe('<svg class="redbox" viewBox="0 0 100 100"><path d="M 8.74211 7.70899"></path></svg>');
});

test("supports SVG", () => {
  const svg = hs(
    "svg",
    { class: "redbox", viewBox: "0 0 100 100" },
    hs("path", { d: "M 8.74211 7.70899" }),
  );

  expect(normalizeSvg(svg)).toBe(
    '<svg class="redbox" viewBox="0 0 100 100"><path d="M 8.74211 7.70899"></path></svg>',
  );
});

test("can add an array of svg elements", () => {
  const circles = [1, 2, 3];
  expect(
    normalizeSvg(
      svg`<svg>
        ${() => circles.map((c) => svg`<circle cx="0" cy="${c}" r="10" />`)}
      </svg>`,
    ),
  ).toBe(
    '<svg><circle cx="0" cy="1" r="10"></circle><circle cx="0" cy="2" r="10"></circle><circle cx="0" cy="3" r="10"></circle></svg>',
  );
});
