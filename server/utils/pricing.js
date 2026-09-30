import env from "../config/env.js";

export const FREE_SHIPPING_THRESHOLD = env.freeShippingThreshold;
export const FLAT_SHIPPING_RATE = env.flatShippingRate;

export const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

/** Completely free over the threshold, flat rate otherwise, zero when empty. */
export const calculateShipping = (subtotal) => {
  const amount = roundMoney(subtotal);
  if (amount <= 0) return 0;
  return amount >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_RATE;
};

export const calculateTotals = (items) => {
  const subtotal = items.reduce(
    (total, item) => roundMoney(total + item.lineTotal),
    0,
  );
  const shipping = calculateShipping(subtotal);
  return {
    subtotal,
    shipping,
    total: roundMoney(subtotal + shipping),
    currency: env.currency,
  };
};
