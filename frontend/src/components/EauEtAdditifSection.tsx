import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getEauAdditifCards, getCat3Pages, getOrders } from "@/api/database";
import { useAuth } from "@/hooks/useAuth";

/**
 * Cover section on Home that links to /eau-et-additif.
 * Shows ⚠️ in center of cover image only when at least one card on /eau-et-additif is red (stock critique) or yellow (pending order).
 * Icon appears only here — not on the /eau-et-additif page.
 */
const EauEtAdditifSection = () => {
  const { isAdmin } = useAuth();
  const { data: cards = [] } = useQuery({
    queryKey: ["eau_additif"],
    queryFn: getEauAdditifCards,
    staleTime: 0,
  });
  const { data: cat3Pages = [] } = useQuery({
    queryKey: ["cat3_pages"],
    queryFn: getCat3Pages,
    staleTime: 0,
  });
  const { data: pendingOrders = [] } = useQuery({
    queryKey: ["orders", "pending"],
    queryFn: () => getOrders({ status: "pending" }),
    enabled: isAdmin,
    staleTime: 0,
  });

  const hasEauAlert = useMemo(() => {
    if (!isAdmin) return false;
    const categoryIdsRedOrYellow = new Set<string>();
    for (const page of cat3Pages) {
      const catId = String(page.cardId ?? page.id ?? "");
      if (!catId) continue;
      const hasCriticalStock = (page.items ?? []).some(
        (item) =>
          Number(item.stock ?? 0) <= Number(item.alertThreshold ?? 0)
      );
      const hasPendingOrder =
        isAdmin &&
        pendingOrders.some((o) => {
          const snap = o.product_snapshot as { cat3Id?: number; itemId?: number } | undefined;
          return (
            o.status === "pending" &&
            snap &&
            (String(snap.cat3Id) === catId ||
              (page.id != null && Number(snap.cat3Id) === Number(page.id)))
          );
        });
      if (hasCriticalStock || hasPendingOrder) categoryIdsRedOrYellow.add(catId);
    }
    return cards.some((card) =>
      categoryIdsRedOrYellow.has(String(card.id)) ||
      (card.cat3PageId != null && categoryIdsRedOrYellow.has(String(card.cat3PageId)))
    );
  }, [cards, cat3Pages, pendingOrders, isAdmin]);

  return (
    <section className="relative w-full bg-black text-white">
      <div className="relative overflow-hidden">
        <div className="h-[320px] sm:h-[380px] md:h-[420px] lg:h-[480px] w-full relative">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/huille.JPEG')" }}
            aria-hidden
          />
          <div className="absolute inset-0 bg-black/50" />

          {hasEauAlert && (
            <span
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white border-2 border-gray-200 shadow-lg text-[52px] sm:text-[64px] leading-none"
              style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
              title="Au moins une catégorie en alerte (stock critique ou commande en attente)"
              role="img"
              aria-label="Alerte stock"
            >
              ⚠️
            </span>
          )}

          {/* Content - same layout as hero: left on desktop, centered on mobile */}
          <div className="absolute inset-0 flex items-center">
          <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-2xl mx-auto lg:mx-0 text-center lg:text-left">
              <p className="text-xs font-semibold tracking-[0.25em] text-orange-400 uppercase mb-2">
                CATALOGUE RAM AUTO MOTORS
              </p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3">
                EAU ET ADDITIF
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-gray-100/90 mb-6">
                Découvrez notre gamme d&apos;eau et additifs pour améliorer les performances et protéger votre moteur.
              </p>
              <div className="flex justify-center lg:justify-start">
                <Link
                  to="/eau-et-additif"
                  className="inline-flex items-center justify-center rounded-full bg-orange-500 px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base font-semibold shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-colors"
                >
                  Découvrir
                </Link>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EauEtAdditifSection;
