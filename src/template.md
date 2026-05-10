# Cosuous Template

Cosuous Template pre-renders an element once and clones it on every call, binding props to the cloned nodes via recorded actions. Reach for it when the same shape is rendered many times (rows, list items) and per-render work matters; for one-off views, plain `html`/`h` is simpler and just as fast.

A template can look something like this:

```js
import { h } from "cosuous";
import { template, t, s } from "cosuous/template";

const Row = template(
  () => html`
    <tr class=${s("selected")}>
      <td class="col-md-1" textContent=${t("id")} />
      <td class="col-md-4"><a>${s("label")}</a></td>
      <td class="col-md-1">
        <a>
          <span class="glyphicon glyphicon-remove remove" />
        </a>
      </td>
      <td class="col-md-6" />
    </tr>
  `,
);
```

The `Row` in this case would accept an object like so:

```js
Row({ id: 1, label: "Banana", selected: "peel" });
```

## API

### `template(elementRef, noClone?)`

Records the tag positions inside `elementRef()` and returns a `(props) => Node` factory. When `noClone` is true, the original fragment is reused instead of cloned (useful for single-mount roots).

### `t(key)`

A static tag. Reads `props[key]` once when the template is created from props.

### `s(key)`

A signal tag. Adds a proxy on the passed object's property and repeats the recorded tag action when the property is set, so updating `props.label = "..."` re-runs the bound DOM update.
