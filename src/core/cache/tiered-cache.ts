/**
 * High-Performance O(1) LRU Cache with TTL and Async Single-Flight (Stampede Protection).
 */

interface CacheNode<K, V> {
  key: K;
  value: V;
  expiresAt: number;
  prev: CacheNode<K, V> | null;
  next: CacheNode<K, V> | null;
}

export class TieredLruCache<K, V> {
  private capacity: number;
  private defaultTtlMs: number;
  private map: Map<K, CacheNode<K, V>> = new Map();
  private inFlight: Map<K, Promise<V>> = new Map();
  private head: CacheNode<K, V> | null = null;
  private tail: CacheNode<K, V> | null = null;

  constructor(options: { capacity: number; defaultTtlMs?: number }) {
    this.capacity = Math.max(1, options.capacity);
    this.defaultTtlMs = options.defaultTtlMs || 60_000;
  }

  public get(key: K, now: number = Date.now()): V | undefined {
    const node = this.map.get(key);
    if (!node) return undefined;

    if (now > node.expiresAt) {
      this.delete(key);
      return undefined;
    }

    this.moveToHead(node);
    return node.value;
  }

  public set(key: K, value: V, ttlMs?: number, now: number = Date.now()): void {
    const ttl = ttlMs ?? this.defaultTtlMs;
    const expiresAt = now + ttl;

    let node = this.map.get(key);
    if (node) {
      node.value = value;
      node.expiresAt = expiresAt;
      this.moveToHead(node);
      return;
    }

    if (this.map.size >= this.capacity && this.tail) {
      this.delete(this.tail.key);
    }

    node = {
      key,
      value,
      expiresAt,
      prev: null,
      next: this.head,
    };

    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;
    if (!this.tail) {
      this.tail = node;
    }

    this.map.set(key, node);
  }

  /**
   * Single-flight fetch: deduplicates concurrent requests for the same key.
   */
  public async getOrFetch(
    key: K,
    fetcher: () => Promise<V>,
    ttlMs?: number
  ): Promise<V> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    const existingPromise = this.inFlight.get(key);
    if (existingPromise) return existingPromise;

    const promise = (async () => {
      try {
        const val = await fetcher();
        this.set(key, val, ttlMs);
        return val;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  public delete(key: K): boolean {
    const node = this.map.get(key);
    if (!node) return false;

    if (node.prev) node.prev.next = node.next;
    if (node.next) node.next.prev = node.prev;
    if (node === this.head) this.head = node.next;
    if (node === this.tail) this.tail = node.prev;

    return this.map.delete(key);
  }

  public size(): number {
    return this.map.size;
  }

  private moveToHead(node: CacheNode<K, V>): void {
    if (node === this.head) return;

    if (node.prev) node.prev.next = node.next;
    if (node.next) node.next.prev = node.prev;
    if (node === this.tail) this.tail = node.prev;

    node.prev = null;
    node.next = this.head;
    if (this.head) this.head.prev = node;
    this.head = node;
  }
}
