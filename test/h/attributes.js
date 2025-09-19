import test from 'tape';
import { html } from 'sinuous';

test('label sets for attribute', function (t) {
  const label = html`<label for="my-input">My Label</label>`;
  t.equal(label.outerHTML, '<label for="my-input">My Label</label>', 'label should have correct HTML structure');
  t.end();
});

test('element calls onMount when inserted', function (t) {
  let called = false;
  const onMount = () => {
    called = true;
  };

  const div = html`<div onMount=${onMount}>Hello</div>`;
  document.body.appendChild(div);

  setTimeout(() => {
    t.ok(called, 'onMount should be called after insertion');
    t.end();
  }, 40); // allow requestAnimationFrame to run
});

test('element calls onUnmount when removed', function (t) {
  let called = false;
  const onUnmount = () => {
    called = true;
  };

  const div = html`<div onUnmount=${onUnmount}>Hello</div>`;
  document.body.appendChild(div);

  setTimeout(() => {
    document.body.removeChild(div);
    setTimeout(() => {
      t.ok(called, 'onUnmount should be called after removal');
      t.end();
    }, 40); // allow MutationObserver to run
  }, 40);
});
