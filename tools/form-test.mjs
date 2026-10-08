import { JSDOM } from 'jsdom';
import fs from 'node:fs';

const root = 'C:/Users/JESSICA/Desktop/portfolio';
const html = fs.readFileSync(root + '/index.html', 'utf8');
const js = fs.readFileSync(root + '/assets/js/main.js', 'utf8');

let pass = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + label); }
  else { fail++; console.log('  FAIL  ' + label + (extra ? '  -> ' + extra : '')); }
}

function makePage(action) {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://example.com/' });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
  w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  w.scrollTo = () => {};
  if (action !== undefined) {
    w.document.getElementById('contact-form').setAttribute('action', action);
  }
  const calls = [];
  w.fetch = (url, opts) => {
    calls.push({ url, opts, body: [...opts.body.entries()] });
    return w.__respond(url, opts);
  };
  w.eval(js);
  return { dom, w, calls };
}

function fill(w) {
  const d = w.document;
  d.getElementById('name').value = 'Ada Lovelace';
  d.getElementById('email').value = 'ada@example.com';
  d.getElementById('message').value = 'I need a content calendar for a launch in March.';
}
const status = w => w.document.getElementById('form-status');
const btn = w => w.document.querySelector('#contact-form [type=submit]');
const fire = (w, el, type) => el.dispatchEvent(new w.Event(type, { bubbles: true, cancelable: true }));

/* ---------- 1. placeholder endpoint ---------- */
console.log('\n1. No endpoint yet (placeholder action)');
{
  const { w, calls } = makePage('[PLACEHOLDER: https://formspree.io/f/your-form-id]');
  fill(w);
  fire(w, w.document.getElementById('contact-form'), 'submit');
  check('no network call made', calls.length === 0);
  check('friendly demo message shown', /not connected to an inbox/.test(status(w).textContent));
  check('state=success', status(w).getAttribute('data-state') === 'success');
  check('form cleared', w.document.getElementById('name').value === '');
}

/* ---------- 2. validation ---------- */
console.log('\n2. Validation');
{
  const { w, calls } = makePage('[PLACEHOLDER: x]');
  fire(w, w.document.getElementById('contact-form'), 'submit');
  check('blocks submit', calls.length === 0);
  check('error status', status(w).getAttribute('data-state') === 'error');
  check('name flagged', w.document.getElementById('name').closest('.field').classList.contains('has-error'));
  check('aria-invalid set', w.document.getElementById('email').getAttribute('aria-invalid') === 'true');

  const { w: w2 } = makePage('[PLACEHOLDER: x]');
  w2.document.getElementById('name').value = 'Ada';
  w2.document.getElementById('email').value = 'not-an-email';
  w2.document.getElementById('message').value = 'short';
  fire(w2, w2.document.getElementById('contact-form'), 'submit');
  check('bad email flagged', w2.document.getElementById('email').closest('.field').classList.contains('has-error'));
  check('short message flagged', w2.document.getElementById('message').closest('.field').classList.contains('has-error'));

/* ---------- 3. happy path to Formspree ---------- */
console.log('\n3. Real endpoint - successful send');
{
  const { w, calls } = makePage('https://formspree.io/f/abc123');
  w.__respond = () => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
  fill(w);
  fire(w, w.document.getElementById('contact-form'), 'submit');
  await new Promise(r => setTimeout(r, 40));

  check('exactly one request', calls.length === 1, String(calls.length));
  check('POSTs to the endpoint', calls[0] && calls[0].url === 'https://formspree.io/f/abc123');
  check('method POST', calls[0] && calls[0].opts.method === 'POST');
  check('Accept: application/json', calls[0] && calls[0].opts.headers.Accept === 'application/json');
  const names = calls[0] ? calls[0].body.map(e => e[0]) : [];
  check('sends name', names.includes('name'));
  check('sends email', names.includes('email'));
  check('sends message', names.includes('message'));
  check('sends select', names.includes('help'));
  check('sends _subject', names.includes('_subject'));
  check('sends _gotcha honeypot', names.includes('_gotcha'));
  const gotcha = calls[0] && calls[0].body.find(e => e[0] === '_gotcha');
  check('honeypot submitted empty', !!gotcha && gotcha[1] === '');
  check('success message', /on its way/.test(status(w).textContent));
  check('state=success', status(w).getAttribute('data-state') === 'success');
  check('form reset', w.document.getElementById('name').value === '');
  check('_subject restored after reset', w.document.querySelector('input[name=_subject]').value === 'New portfolio enquiry');
  check('button re-enabled', btn(w).disabled === false);
  check('button label restored', btn(w).textContent === 'Send message');
}

/* ---------- 4. in-flight button state ---------- */
console.log('\n4. While sending');
{
  const { w } = makePage('https://formspree.io/f/abc123');
  let resolveIt;
  w.__respond = () => new Promise(r => { resolveIt = r; });
  fill(w);
  fire(w, w.document.getElementById('contact-form'), 'submit');
  await new Promise(r => setTimeout(r, 5));
  check('button disabled', btn(w).disabled === true);
  check('aria-busy set', btn(w).getAttribute('aria-busy') === 'true');
  check('label changed', /Sending/.test(btn(w).textContent));
  check('status=info while sending', status(w).getAttribute('data-state') === 'info');
  resolveIt({ ok: true, json: () => Promise.resolve({}) });
  await new Promise(r => setTimeout(r, 30));
  check('button restored after send', btn(w).disabled === false);
}

/* ---------- 5. Formspree rejects ---------- */
console.log('\n5. Server-side rejection (4xx)');
{
  const { w } = makePage('https://formspree.io/f/abc123');
  w.__respond = () => Promise.resolve({
    ok: false, status: 422,
    json: () => Promise.resolve({ errors: [{ message: 'Form disabled.' }] })
  });
  fill(w);
  fire(w, w.document.getElementById('contact-form'), 'submit');
  await new Promise(r => setTimeout(r, 40));
  check('server message surfaced', /Form disabled/.test(status(w).textContent));
  check('state=error', status(w).getAttribute('data-state') === 'error');
  check('values kept for retry', w.document.getElementById('name').value === 'Ada Lovelace');
  check('button re-enabled', btn(w).disabled === false);
}

/* ---------- 6. network failure ---------- */
console.log('\n6. Network failure');
{
  const { w } = makePage('https://formspree.io/f/abc123');
  w.__respond = () => Promise.reject(new TypeError('Failed to fetch'));
  fill(w);
  fire(w, w.document.getElementById('contact-form'), 'submit');
  await new Promise(r => setTimeout(r, 40));
  check('offline message', /could not reach/.test(status(w).textContent));
  check('state=error', status(w).getAttribute('data-state') === 'error');
  check('button re-enabled', btn(w).disabled === false);
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);


  const { w: w3 } = makePage('[PLACEHOLDER: x]');
  w3.document.getElementById('name').value = 'Ada';
  w3.document.getElementById('email').value = 'ada@example.com';
  w3.document.getElementById('message').value = 'Too short';
  fire(w3, w3.document.getElementById('contact-form'), 'submit');
  check('10-char minimum enforced', w3.document.getElementById('message').closest('.field').classList.contains('has-error'));
}
