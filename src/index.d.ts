export = cosuous;
export as namespace cosuous;

import { JSXInternal } from "./jsx";
import { HyperscriptApi } from "./h";
import * as _shared from "./shared";
import * as _o from "./observable";

import FunctionComponent = _shared.FunctionComponent;
import ElementChildren = _shared.ElementChildren;

declare module "cosuous/jsx" {
  namespace JSXInternal {
    interface DOMAttributes<Target extends EventTarget> {
      children?: ElementChildren;
    }
  }
}

// Adapted from Preact's index.d.ts
// Namespace prevents conflict with React typings
declare namespace cosuous {
  export import JSX = JSXInternal;

  export import signal = _o.signal;
  export import computed = _o.computed;
  export import effect = _o.effect;
  export import effectScope = _o.effectScope;
  export import untracked = _o.untracked;
  export import onCleanup = _o.onCleanup;
  export import startBatch = _o.startBatch;
  export import endBatch = _o.endBatch;
  export import trigger = _o.trigger;
  export import isSignal = _o.isSignal;
  export import isComputed = _o.isComputed;

  const html: (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ) => HTMLElement | DocumentFragment;
  const svg: (strings: TemplateStringsArray, ...values: unknown[]) => SVGElement | DocumentFragment;

  // Split HyperscriptApi's h() tag into functions with more narrow typings
  function h(
    type: string,
    props: (JSXInternal.HTMLAttributes & Record<string, unknown>) | null,
    ...children: ElementChildren[]
  ): HTMLElement;
  function h(
    type: FunctionComponent,
    props: (JSXInternal.HTMLAttributes & Record<string, unknown>) | null,
    ...children: ElementChildren[]
  ): HTMLElement | DocumentFragment;
  function h(tag: ElementChildren[] | [], ...children: ElementChildren[]): DocumentFragment;
  namespace h {
    export import JSX = JSXInternal;
  }

  function hs(
    type: string,
    props: (JSXInternal.SVGAttributes & Record<string, unknown>) | null,
    ...children: ElementChildren[]
  ): SVGElement;
  function hs(
    type: FunctionComponent,
    props: (JSXInternal.SVGAttributes & Record<string, unknown>) | null,
    ...children: ElementChildren[]
  ): SVGElement | DocumentFragment;
  function hs(tag: ElementChildren[] | [], ...children: ElementChildren[]): DocumentFragment;
  namespace hs {
    export import JSX = JSXInternal;
  }

  /** Cosuous API */
  interface CosuousApi extends HyperscriptApi {
    // Hyperscript
    hs: <T extends () => unknown>(closure: T) => ReturnType<T>;
  }

  const api: CosuousApi;
}
