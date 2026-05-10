export = cosuous;
export as namespace cosuous;

import { JSXInternal } from "./jsx";
import { HyperscriptApi } from "./h";
import * as _shared from "./shared";
import * as _s from "./signal";

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

  export import signal = _s.signal;
  export import computed = _s.computed;
  export import effect = _s.effect;
  export import effectScope = _s.effectScope;
  export import untracked = _s.untracked;
  export import onCleanup = _s.onCleanup;
  export import startBatch = _s.startBatch;
  export import endBatch = _s.endBatch;
  export import trigger = _s.trigger;
  export import isSignal = _s.isSignal;
  export import isComputed = _s.isComputed;

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
