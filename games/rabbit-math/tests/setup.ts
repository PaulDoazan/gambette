// Node 25+ exposes an experimental `localStorage` global that lacks `clear` /
// `setItem` unless `--localstorage-file` is set. That broken global shadows
// jsdom's Storage implementation. Replace it with a working in-memory shim.
class MemoryStorage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(String(key), String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

const install = (target: { localStorage?: unknown }) => {
  Object.defineProperty(target, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  });
};

install(globalThis as { localStorage?: unknown });
if (typeof window !== 'undefined') {
  install(window as unknown as { localStorage?: unknown });
}
