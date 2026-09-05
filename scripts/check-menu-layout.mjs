import { readFileSync } from 'node:fs';

const navigationCss = readFileSync(new URL('../src/components/hub-navigation.css', import.meta.url), 'utf8');
const moduleHeaderCss = readFileSync(new URL('../src/components/hub-module-header.css', import.meta.url), 'utf8');
const navigationSource = readFileSync(new URL('../src/components/HubNavigation.tsx', import.meta.url), 'utf8');
const moduleHeaderSource = readFileSync(new URL('../src/components/HubModuleHeader.tsx', import.meta.url), 'utf8');

function assert(condition, message) {
  if (condition) return;
  console.error(`MENU_LAYOUT_CONTRACT_FAILED: ${message}`);
  process.exit(1);
}

assert(
  !/\.hub-menu-trigger\s*\{[^}]*position:\s*fixed/s.test(navigationCss),
  'the closed global menu trigger must not use position: fixed',
);
assert(
  !navigationSource.includes('className="hub-menu-chrome"'),
  'the retired standalone menu chrome row must not render',
);
assert(
  moduleHeaderSource.includes('<HubMenuTrigger />'),
  'the global menu trigger must render inside HubModuleHeader',
);
assert(
  /\.hub-module-actions\s*\{[^}]*display:\s*flex/s.test(moduleHeaderCss),
  'the module header must reserve structural space for meta and menu actions',
);
assert(
  !navigationCss.includes('padding-bottom: calc(76px + env(safe-area-inset-bottom))'),
  'the retired 76px mobile compensation must not return',
);

console.log('MENU_LAYOUT_CONTRACT_OK');
