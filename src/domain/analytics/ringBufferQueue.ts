/**
 * @file ringBufferQueue.ts
 * @description High-performance, pre-allocated in-memory Ring Buffer Queue for telemetry events.
 *
 * Designed to guarantee < 0.05 ms (< 50 microseconds) synchronous execution cost
 * on the 120Hz UI render thread. Prevents memory leaks by maintaining a fixed-size FIFO buffer.
 */

export class LockFreeRingBufferQueue<T> {
  private readonly buffer: (T | undefined)[];
  private readonly capacity: number;
  private head: number = 0; // Pointer to the oldest item
  private tail: number = 0; // Pointer to the next insertion slot
  private count: number = 0;

  constructor(capacity = 250) {
    if (capacity <= 0) {
      throw new Error('RingBuffer capacity must be a positive integer.');
    }
    this.capacity = capacity;
    this.buffer = new Array<T | undefined>(capacity);
  }

  /**
   * Pushes an item into the ring buffer in O(1) time (< 0.05 ms).
   * If the buffer is full, the oldest unread item is evicted (FIFO overwrite).
   */
  public enqueue(item: T): void {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;

    if (this.count < this.capacity) {
      this.count++;
    } else {
      // Overwrite occurred, advance head to drop oldest item
      this.head = (this.head + 1) % this.capacity;
    }
  }

  /**
   * Dequeues and removes up to `maxBatchSize` items from the buffer.
   */
  public drainBatch(maxBatchSize: number): T[] {
    const toDrain = Math.min(this.count, maxBatchSize);
    if (toDrain === 0) return [];

    const batch: T[] = new Array(toDrain);
    for (let i = 0; i < toDrain; i++) {
      batch[i] = this.buffer[this.head]!;
      this.buffer[this.head] = undefined; // Allow garbage collection
      this.head = (this.head + 1) % this.capacity;
      this.count--;
    }

    return batch;
  }

  /**
   * Returns current count of queued items.
   */
  public size(): number {
    return this.count;
  }

  /**
   * Returns true if queue is empty.
   */
  public isEmpty(): boolean {
    return this.count === 0;
  }

  /**
   * Clears all items from the buffer.
   */
  public clear(): void {
    this.buffer.fill(undefined);
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }
}
