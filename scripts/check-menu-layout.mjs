import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/components/hub-navigation.css', import.meta.url), 'utf8');

function assert(condition, message) {
  if (condition) return;
  console.error(`MENU_LAYOUT_CONTRACT_FAILED: ${message}`);
  process.exit(1);
}

assert(
  !/\.hub-menu-trigger\s*\{[^}]*position:\s*fixed/s.test(css),
  'the closed global menu trigger must not use position: fixed',
);
assert(
  /\.hub-menu-chrome\s*\{[^}]*display:\s*flex/s.test(css),
  'the global menu trigger must live in a structural flex chrome row',
);
assert(
  !css.includes('padding-bottom: calc(76px + env(safe-area-inset-bottom))'),
  'the retired 76px mobile compensation must not return',
);

console.log('MENU_LAYOUT_CONTRACT_OK');
