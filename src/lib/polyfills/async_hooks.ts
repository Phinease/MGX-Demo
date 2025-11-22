// Polyfill for Node.js async_hooks in browser environment
export class AsyncLocalStorage {
  private store: Map<string, any>;

  constructor() {
    this.store = new Map();
  }

  run(store: any, callback: (...args: any[]) => any, ...args: any[]) {
    const key = 'current';
    const previousStore = this.store.get(key);
    this.store.set(key, store);
    
    try {
      return callback(...args);
    } finally {
      if (previousStore === undefined) {
        this.store.delete(key);
      } else {
        this.store.set(key, previousStore);
      }
    }
  }

  getStore() {
    return this.store.get('current');
  }

  enterWith(store: any) {
    this.store.set('current', store);
  }

  exit(callback: (...args: any[]) => any, ...args: any[]) {
    const key = 'current';
    const previousStore = this.store.get(key);
    this.store.delete(key);
    
    try {
      return callback(...args);
    } finally {
      if (previousStore !== undefined) {
        this.store.set(key, previousStore);
      }
    }
  }

  disable() {
    this.store.clear();
  }
}

export default {
  AsyncLocalStorage,
};

