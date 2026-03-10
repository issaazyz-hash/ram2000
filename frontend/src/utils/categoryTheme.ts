/**
 * Category status theme (FAMILLES DES PIÈCES): red = rupture, yellow = stock faible, none = default.
 * Use the same mapping on family cards (home) and /cat/[slug] page for consistent color theme.
 */
export type CategoryStatusColor = "red" | "yellow" | "none";

export interface MapCategoryStatusOptions {
  /** If true, adds rounded-2xl for card/page container style. Default true. */
  rounded?: boolean;
}

/**
 * Maps category status to CSS classes (background, border, shadow) matching index.css .status-red / .status-yellow.
 * Use in FamilleSection, FamillesPiecesSectionCompact, and CatPage.
 */
export function mapCategoryStatusToClass(
  status: CategoryStatusColor,
  options: MapCategoryStatusOptions = {}
): string {
  const { rounded = true } = options;
  const roundedClass = rounded ? " rounded-2xl" : "";
  if (status === "red") return `status-red${roundedClass}`;
  if (status === "yellow") return `status-yellow${roundedClass}`;
  return "";
}

/**
 * Returns badge class for status (RUPTURE / STOCK FAIBLE). Use for corner badges.
 */
export function mapCategoryStatusToBadgeClass(status: CategoryStatusColor): string {
  if (status === "red") return "status-badge-red";
  if (status === "yellow") return "status-badge-yellow";
  return "";
}

/**
 * Returns link-style class for subcategory links (left border + text color).
 */
export function mapCategoryStatusToLinkClass(status: CategoryStatusColor): string {
  if (status === "red") return "status-red-link";
  if (status === "yellow") return "status-yellow-link";
  return "";
}
