// Ensure jsdom's localStorage overrides Node 25's built-in (which lacks .clear()).
// Node >=22 adds a partial globalThis.localStorage that vitest's populateGlobal skips
// (because the key is already present in global). We manually redirect it here.
const jsdomInstance = (globalThis as any).jsdom;
if (jsdomInstance?.window?.localStorage) {
  Object.defineProperty(globalThis, 'localStorage', {
    get: () => jsdomInstance.window.localStorage,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'sessionStorage', {
    get: () => jsdomInstance.window.sessionStorage,
    configurable: true,
  });
}
