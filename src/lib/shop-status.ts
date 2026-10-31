/**
 * Is the CeritaShop open for members? Until it is, members see the shop bag with "binnenkort" but
 * cannot open the shop; admins can, so they can prepare and test it. Set to true to open it.
 */
export const SHOP_OPEN = false;

export function canEnterShop(me: { isAdmin?: boolean } | null | undefined, open = SHOP_OPEN) {
  return open || !!me?.isAdmin;
}
