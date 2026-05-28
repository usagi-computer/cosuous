/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Vendored from htm. Carries the Sinuous-era patch in `evaluate()` that
 * defers component children behind a closure (`args.push(... ? result : result())`)
 * so component parents see lazy children. See memory project_htm_vendored.
 *
 * Internally untyped beyond the boundary: the parser's IR is a packed mixed
 * array of strings, numbers (field indices), child arrays, and small integer
 * opcodes; layering exact types on it costs clarity without buying safety.
 */

const MINI = false;

const MODE_SLASH = 0;
const MODE_TEXT = 1;
const MODE_WHITESPACE = 2;
const MODE_TAGNAME = 3;
const MODE_COMMENT = 4;
const MODE_PROP_SET = 5;
const MODE_PROP_APPEND = 6;

const TAG_SET = 1;
const CHILD_APPEND = 0;
const CHILD_RECURSE = 2;
const PROPS_ASSIGN = 3;
const PROP_SET = MODE_PROP_SET;
const PROP_APPEND = MODE_PROP_APPEND;

type HFn = (...args: unknown[]) => unknown;
type Built = unknown[];
// ArrayLike so both IArguments (build's `arguments`) and unknown[] (regular's
// `arguments` after the spread call site) flow through uniformly without
// requiring lossy IArguments-to-Array casts at every index access.
type Fields = ArrayLike<unknown>;

const evaluate = (h: HFn, built: Built, fields: Fields, args: unknown[]): unknown[] => {
  const propBody: Record<string, unknown[]> = {};
  for (let i = 1; i < built.length; i++) {
    const field = built[i];
    const value = typeof field === "number" ? fields[field] : field;
    const type = built[++i];

    if (type === TAG_SET) {
      args[0] = value;
    } else if (type === PROPS_ASSIGN) {
      args[1] = Object.assign((args[1] as object) || {}, value as object);
    } else if (type === PROP_SET) {
      ((args[1] = (args[1] as Record<string, unknown>) || {}) as Record<string, unknown>)[
        built[++i] as string
      ] = value;
    } else if (type === PROP_APPEND) {
      const key = built[++i] as string;
      const argsObj = (args[1] = (args[1] as Record<string, unknown>) || {}) as Record<
        string,
        unknown
      >;
      const prev = argsObj[key];
      let parts = propBody[key];

      if (!parts && (typeof value === "function" || typeof prev === "function")) {
        parts = (prev !== undefined && [prev]) || [];
        propBody[key] = parts;

        argsObj[key] = function (this: unknown): string {
          let prop = "";
          for (let j = 0; j < parts!.length; j++) {
            prop +=
              typeof parts![j] === "function"
                ? (parts![j] as (this: unknown) => unknown).call(this)
                : parts![j];
          }
          return prop;
        };
      }

      if (parts) {
        parts.push(value);
      } else {
        // Force the new value to string FIRST, then concat - matches the
        // original `args[1][key] += value + ""` precedence so number + number
        // stays string-concatenation, not numeric addition.
        argsObj[key] = (argsObj[key] as string) + (value + "");
      }
    } else if (type) {
      // code === CHILD_RECURSE
      const result = (): unknown => h.apply(null, evaluate(h, value as Built, fields, ["", null]));

      // Sinuous-era patch: if it's a component we pass the children with
      // closure so the component is executed before the children of that
      // component.
      args.push(typeof args[0] === "function" ? result : result());
    } else {
      // code === CHILD_APPEND
      args.push(value);
    }
  }

  return args;
};

function build(this: HFn, statics: TemplateStringsArray): unknown {
  // `arguments` is IArguments here; treat it as ArrayLike so it flows into
  // evaluate's Fields without per-site casts.
  const fields = arguments as unknown as ArrayLike<unknown>;

  let mode = MODE_TEXT;
  let buffer = "";
  let quote = "";
  let current: unknown[] = [0];
  let char: string;
  let propName: string = "";

  const commit = (field?: number): void => {
    if (mode === MODE_TEXT && (field || (buffer = buffer.replace(/^\s*\n\s*|\s*\n\s*$/g, "")))) {
      if (MINI) {
        current.push(field ? fields[field] : buffer);
      } else {
        current.push(field || buffer, CHILD_APPEND);
      }
    } else if (mode === MODE_TAGNAME && (field || buffer)) {
      if (MINI) {
        current[1] = field ? fields[field] : buffer;
      } else {
        current.push(field || buffer, TAG_SET);
      }
      mode = MODE_WHITESPACE;
    } else if (mode === MODE_WHITESPACE && buffer === "..." && field) {
      if (MINI) {
        current[2] = Object.assign((current[2] as object) || {}, fields[field] as object);
      } else {
        current.push(field, PROPS_ASSIGN);
      }
    } else if (mode === MODE_WHITESPACE && buffer && !field) {
      if (MINI) {
        ((current[2] = (current[2] as Record<string, unknown>) || {}) as Record<string, unknown>)[
          buffer
        ] = true;
      } else {
        current.push(true, PROP_SET, buffer);
      }
    } else if (mode >= MODE_PROP_SET) {
      if (MINI) {
        if (mode === MODE_PROP_SET) {
          ((current[2] = (current[2] as Record<string, unknown>) || {}) as Record<string, unknown>)[
            propName
          ] = field ? (buffer ? buffer + fields[field] : fields[field]) : buffer;
          mode = MODE_PROP_APPEND;
        } else if (field || buffer) {
          (current[2] as Record<string, unknown>)[propName] =
            (((current[2] as Record<string, unknown>)[propName] as string) || "") +
            (field ? buffer + fields[field] : buffer);
        }
      } else {
        if (buffer || (!field && mode === MODE_PROP_SET)) {
          current.push(buffer, mode, propName);
          mode = MODE_PROP_APPEND;
        }
        if (field) {
          current.push(field, mode, propName);
          mode = MODE_PROP_APPEND;
        }
      }
    }

    buffer = "";
  };

  for (let i = 0; i < statics.length; i++) {
    if (i) {
      if (mode === MODE_TEXT) {
        commit();
      }
      commit(i);
    }

    const staticI = statics[i]!;
    for (let j = 0; j < staticI.length; j++) {
      char = staticI[j]!;

      if (mode === MODE_TEXT) {
        if (char === "<") {
          // commit buffer
          commit();
          if (MINI) {
            current = [current, "", null];
          } else {
            current = [current];
          }
          mode = MODE_TAGNAME;
        } else {
          buffer += char;
        }
      } else if (mode === MODE_COMMENT) {
        // Ignore everything until the last three characters are '-', '-' and '>'
        if (buffer === "--" && char === ">") {
          mode = MODE_TEXT;
          buffer = "";
        } else {
          buffer = char + buffer[0];
        }
      } else if (quote) {
        if (char === quote) {
          quote = "";
        } else {
          buffer += char;
        }
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === ">") {
        commit();
        mode = MODE_TEXT;
      } else if (!mode) {
        // Ignore everything until the tag ends
      } else if (char === "=") {
        mode = MODE_PROP_SET;
        propName = buffer;
        buffer = "";
      } else if (char === "/" && (mode < MODE_PROP_SET || staticI[j + 1] === ">")) {
        commit();
        if (mode === MODE_TAGNAME) {
          current = current[0] as unknown[];
        }
        const closed = current;
        if (MINI) {
          (current = current[0] as unknown[]).push(this.apply(null, closed.slice(1)));
        } else {
          (current = current[0] as unknown[]).push(closed, CHILD_RECURSE);
        }
        mode = MODE_SLASH;
      } else if (char === " " || char === "\t" || char === "\n" || char === "\r") {
        // <a disabled>
        commit();
        mode = MODE_WHITESPACE;
      } else {
        buffer += char;
      }

      if (mode === MODE_TAGNAME && buffer === "!--") {
        mode = MODE_COMMENT;
        current = current[0] as unknown[];
      }
    }
  }
  commit();

  if (MINI) {
    return current.length > 2 ? current.slice(1) : current[1];
  }
  return current;
}

const CACHES = new WeakMap<HFn, Map<TemplateStringsArray, unknown>>();

function regular(this: HFn, statics: TemplateStringsArray): unknown {
  let cache = CACHES.get(this);
  if (!cache) {
    cache = new Map();
    CACHES.set(this, cache);
  }
  let built = cache.get(statics);
  if (!built) {
    built = build.apply(this, arguments as unknown as [TemplateStringsArray]);
    cache.set(statics, built);
  }
  const out = evaluate(this, built as Built, arguments as unknown as ArrayLike<unknown>, []);
  return out.length > 1 ? out : out[0];
}

function custom(this: HFn): unknown {
  const result = (MINI ? build : regular).apply(
    this,
    arguments as unknown as [TemplateStringsArray],
  );
  if (result) {
    return Array.isArray(result)
      ? this(result)
      : typeof result === "object"
        ? result
        : this([result]);
  }
}

const wrapper = function (this: HFn & { wrap?: HFn }): unknown {
  const h = custom.bind(this);
  return (this.wrap || h).apply(h, arguments as unknown as [TemplateStringsArray]);
};

export default wrapper as (
  this: unknown,
  strings: TemplateStringsArray,
  ...values: unknown[]
) => unknown;
