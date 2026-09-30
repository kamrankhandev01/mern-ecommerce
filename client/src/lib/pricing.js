/**
 * Guest-cart preview math.
 *
 * The server is always authoritative: it recalculates shipping and totals when
 * the order is placed. These helpers exist only so a signed-out visitor sees a
 * sensible estimate before signing in. Values mirror `STORE_CURRENCY`,
 * `FREE_SHIPPING_THRESHOLD` and `FLAT_SHIPPING_RATE` on the server.
 */
export const FREE_SHIPPING_THRESHOLD = 75;
export const FLAT_SHIPPING_RATE = 8;
export const MAX_QUANTITY_PER_ITEM = 99;

export const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export const calculateShipping = (subtotal) => {
  const amount = roundMoney(subtotal);
  if (amount <= 0) return 0;
  return amount >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_RATE;
};

export const summarise = (items) => {
  const subtotal = roundMoney(
    items.reduce(
      (total, item) => total + Number(item.price || 0) * item.quantity,
      0,
    ),
  );
  const shipping = calculateShipping(subtotal);
  return {
    subtotal,
    shipping,
    total: roundMoney(subtotal + shipping),
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    currency: "USD",
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    maxQuantityPerItem: MAX_QUANTITY_PER_ITEM,
  };
};
