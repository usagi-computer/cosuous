import { api } from "./index.ts";
import type { TemplateAction } from "./h.ts";

type TagContext = { el: Node; name?: string | null; endMark?: Node | null };

/**
 * Template tag returned by `t` / `s`. The runtime invokes it via
 * `.call(ctx)` from within h's prop/insert dispatch; the marker `$s`
 * tells src/h.ts (property()) to treat it as a template binding rather
 * than an event handler.
 */
export type TemplateTag = ((this: TagContext) => void) & { $s: number };

export interface CloneFunction {
  (props: Record<string, unknown>, forceNoClone?: boolean): Node;
  $t: true;
}

type RecordedActionList = TemplateAction[];

let recordedActions: RecordedActionList | undefined;

/**
 * Signal template tag.
 */
export function s(key: string): TemplateTag {
  return t(key, true);
}

/**
 * Template tag.
 */
export function t(key: string, observed?: boolean, bind?: boolean): TemplateTag {
  const tag = function (this: TagContext): void {
    const { el, name, endMark } = this;

    const action: TemplateAction = ((
      element: Node,
      endMark: Node | null,
      propName: string | null,
      value: unknown,
    ): void => {
      if (propName == null) {
        // Store state on the unique endMark per action.
        const state = (endMark || element) as Node & { _current?: unknown };

        // Performance optimization for when the tag is the only content child.
        // Default current value to empty string which makes a text insert faster.
        if (
          endMark &&
          (endMark as Node & { _current?: unknown })._current === undefined &&
          element.firstChild === element.lastChild &&
          element.firstChild === endMark
        ) {
          (endMark as Node & { _current?: unknown })._current = "";
        }

        state._current = api.insert(element, value, endMark, state._current as unknown);
      } else {
        api.property(element, value, propName);
      }
    }) as TemplateAction;

    action._el = el;
    action._endMark = endMark ?? null;
    action._propName = name ?? null;
    action._key = key;
    // Only assign when present so exactOptionalPropertyTypes accepts the
    // optional-field shape declared in TemplateAction.
    if (observed !== undefined) action._observed = observed;
    if (bind !== undefined) action._bind = bind;
    recordedActions!.push(action);
  } as TemplateTag;

  // Tiny indicator that this is a template tag.
  // Used in src/h.ts (property()).
  tag.$s = 2;

  return tag;
}

/**
 * Creates a template function.
 */
export function template(elementRef: () => Node, noClone?: boolean): CloneFunction {
  const prevRecordedActions = recordedActions;
  recordedActions = [];

  const tpl = elementRef() as Node & { content?: DocumentFragment; parentNode?: Node | null };

  const cloneActions = recordedActions;
  recordedActions = prevRecordedActions;

  let fragment: (Node & { _childNodes?: ChildNode[] }) | null =
    (tpl.content as Node & { _childNodes?: ChildNode[] }) ||
    ((tpl.parentNode as (Node & { _childNodes?: ChildNode[] }) | null) && tpl);
  if (!fragment) {
    fragment = document.createDocumentFragment() as DocumentFragment & {
      _childNodes?: ChildNode[];
    };
    fragment.appendChild(tpl);
  }

  const stamp = fragment.cloneNode(true);

  if (!noClone) {
    cloneActions.forEach((action) => {
      action._paths = createPath(fragment!, action._el!);
      action._endMarkPath = action._endMark ? createPath(action._el!, action._endMark) : null;
    });
  }

  const create = function (props: Record<string, unknown>, forceNoClone?: boolean): Node {
    // Explicit check for a boolean here, this fn tends to be used in Array.map.
    if (forceNoClone === false || forceNoClone === true) noClone = forceNoClone;

    const keyedActions: Record<string, Array<(value: unknown) => void>> = {};
    let root: Node;
    if (noClone) {
      if (fragment!._childNodes) {
        fragment!._childNodes.forEach((child) => fragment!.appendChild(child));
      }
      root = fragment!;
    } else {
      root = stamp.cloneNode(true);
    }

    // Set a custom property `props` for easy access to the passed argument.
    if (root.firstChild) {
      (root.firstChild as Node & { props?: Record<string, unknown> }).props = props;
    }

    // These paths have to be resolved before any elements are inserted.
    cloneActions.forEach((action) => {
      const target = noClone ? action._el : getPath(root, action._paths!);
      if (target) action._target = target;
      const endMarkTarget = noClone
        ? (action._endMark ?? null)
        : action._endMarkPath
          ? getPath(action._target!, action._endMarkPath)
          : null;
      action._endMarkTarget = endMarkTarget;
    });

    cloneActions.forEach((action) => {
      api.action!(action, props, keyedActions)(action._key!, action._propName!);
    });

    // Copy the childNodes after inserting the values. This is needed for
    // fills with primitive values that stay the same between renders.
    fragment!._childNodes = Array.from(fragment!.childNodes);

    return root;
  } as CloneFunction;

  // Tiny indicator that this is a template create function.
  create.$t = true;

  return create;
}

api.action = (action, props, keyedActions) => {
  const target = action._target!;

  // In the `data` module `key` and `propName` are transformed for special cases.
  return (key: string, propName: string | null) => {
    let value = props[key];
    if (value != null) {
      action(target, action._endMarkTarget ?? null, propName, value);
    }

    if (action._observed) {
      if (!keyedActions[key]) {
        keyedActions[key] = [];

        Object.defineProperty(props, key, {
          get() {
            if (action._bind) {
              if (propName != null && propName in (target as object)) {
                return (target as unknown as Record<string, unknown>)[propName];
              }
              return target;
            }
            return value;
          },
          set(newValue: unknown) {
            value = newValue;
            keyedActions[key]!.forEach((fn) => fn(newValue));
          },
        });
      }
      keyedActions[key]!.push((value: unknown) =>
        action(target, action._endMarkTarget ?? null, propName, value),
      );
    }
  };
};

function createPath(root: Node, el: Node): number[] {
  const paths: number[] = [];
  let parent: Node | null;
  let cur: Node = el;
  while ((parent = cur.parentNode) !== root.parentNode) {
    paths.unshift(Array.from(parent!.childNodes).indexOf(cur as ChildNode));
    cur = parent!;
  }
  return paths;
}

function getPath(target: Node, paths: number[]): Node {
  let cur: Node = target;
  paths.forEach((depth) => (cur = cur.childNodes[depth]!));
  return cur;
}
