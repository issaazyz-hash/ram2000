import { useState, useEffect } from "react";
import { getProcessedOrderIds, subscribe } from "@/store/pendingOrdersStore";

/**
 * Returns the set of order IDs that have been optimistically marked as processed
 * (accepted/rejected). Used to immediately remove yellow highlight from promo cards
 * when admin clicks Accepter/Refuser, even before cache/refetch updates.
 */
export function useProcessedOrderIds(): Set<number> {
  const [ids, setIds] = useState<Set<number>>(getProcessedOrderIds);

  useEffect(() => {
    const unsub = subscribe(() => {
      setIds(new Set(getProcessedOrderIds()));
    });
    return unsub;
  }, []);

  return ids;
}
