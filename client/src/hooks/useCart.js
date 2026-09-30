import { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addCartItem,
  addGuestItem,
  clearCart,
  clearGuestCart,
  fetchCart,
  mergeGuestCart,
  removeCartItem,
  removeGuestItem,
  selectCartCount,
  selectCartGuestItems,
  selectCartItems,
  selectCartStatus,
  selectCartTotals,
  setGuestItemQuantity,
  updateCartItem,
} from "../redux/cartSlice";

/**
 * The single cart API used by the whole client.
 *
 * Signed-in visitors talk to `/api/cart` (their own stored cart); signed-out
 * visitors mutate a browser-local guest cart that is merged on sign-in.
 */
export const useCart = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user.user);
  const items = useSelector(selectCartItems);
  const totals = useSelector(selectCartTotals);
  const guestItems = useSelector(selectCartGuestItems);
  const status = useSelector(selectCartStatus);
  const mutating = useSelector((state) => state.cart?.mutating || false);
  const error = useSelector((state) => state.cart?.error || "");
  const count = useSelector(selectCartCount);

  const resolveId = (product) => String(product?._id || product?.productId || "");

  const addItem = useCallback(
    async (product, quantity = 1) => {
      const productId = resolveId(product);
      if (!productId) return false;

      if (!user) {
        dispatch(addGuestItem({ product, quantity }));
        return true;
      }

      const result = await dispatch(addCartItem({ productId, quantity }));
      if (result.error) {
        // The slice stores the reason in `error`, which the cart panel and the
        // product page render inline. No floating toast needed.
        return false;
      }
      return true;
    },
    [dispatch, user],
  );

  /** quantity of 0 (or less) removes the line. */
  const setQuantity = useCallback(
    async (productId, quantity) => {
      const id = String(productId);
      const next = Math.trunc(Number(quantity) || 0);

      if (!user) {
        dispatch(setGuestItemQuantity({ productId: id, quantity: next }));
        return true;
      }

      const result =
        next < 1
          ? await dispatch(removeCartItem(id))
          : await dispatch(updateCartItem({ productId: id, quantity: next }));

      if (result.error) {
        return false;
      }
      return true;
    },
    [dispatch, user],
  );

  const removeItem = useCallback(
    async (productId) => {
      const id = String(productId);
      if (!user) {
        dispatch(removeGuestItem(id));
        return true;
      }
      const result = await dispatch(removeCartItem(id));
      if (result.error) {
        return false;
      }
      return true;
    },
    [dispatch, user],
  );

  const clear = useCallback(async () => {
    if (!user) {
      dispatch(clearGuestCart());
      return true;
    }
    const result = await dispatch(clearCart());
    return !result.error;
  }, [dispatch, user]);

  const refresh = useCallback(async () => {
    if (!user) return;
    if (guestItems.length > 0) {
      await dispatch(mergeGuestCart(guestItems));
      return;
    }
    await dispatch(fetchCart());
  }, [dispatch, user, guestItems]);

  const isEmpty = items.length === 0;

  return useMemo(
    () => ({
      isSignedIn: Boolean(user),
      items,
      guestItems,
      totals,
      count,
      status,
      loading: status === "loading",
      mutating,
      error,
      isEmpty,
      addItem,
      setQuantity,
      removeItem,
      clear,
      refresh,
    }),
    [
      user,
      items,
      guestItems,
      totals,
      count,
      status,
      mutating,
      error,
      isEmpty,
      addItem,
      setQuantity,
      removeItem,
      clear,
      refresh,
    ],
  );
};

export default useCart;
