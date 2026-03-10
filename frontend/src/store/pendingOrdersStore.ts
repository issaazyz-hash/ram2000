/**
 * Shared store for optimistic order updates.
 * When admin accepts/rejects an order, we mark it as processed so PromotionsSection
 * can immediately exclude it from pending promo highlights (yellow).
 */
type Listener = () => void;
const listeners = new Set<Listener>();
let processedOrderIds = new Set<number>();

export function markOrderProcessed(orderId: number): void {
  processedOrderIds.add(orderId);
  listeners.forEach((l) => l());
}

export function unmarkOrderProcessed(orderId: number): void {
  processedOrderIds.delete(orderId);
  listeners.forEach((l) => l());
}

export function getProcessedOrderIds(): Set<number> {
  return processedOrderIds;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
