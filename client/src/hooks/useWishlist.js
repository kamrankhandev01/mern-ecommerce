import { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addGuestWishlistItem,
  addWishlistItem,
  clearGuestWishlist,
  clearWishlist,
  fetchWishlist,
  mergeGuestWishlist,
  removeGuestWishlistItem,
  removeWishlistItem,
  selectWishlistCount,
  selectWishlistGuestItems,
  selectWishlistItems,
  selectWishlistStatus,
} from "../redux/wishlistSlice";

/**
 * The single wishlist API used by the whole client.
 *
 * Signed-in visitors talk to `/api/wishlist` (their own stored list); signed-out
 * visitors mutate a browser-local guest list that is merged on sign-in.
 */
export const useWishlist = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user.user);
  const items = useSelector(selectWishlistItems);
  const guestItems = useSelector(selectWishlistGuestItems);
  const status = useSelector(selectWishlistStatus);
  const mutating = useSelector((state) => state.wishlist?.mutating || false);
  const error = useSelector((state) => state.wishlist?.error || "");
  const count = useSelector(selectWishlistCount);

  const resolveId = (product) =>
    String(product?._id || product?.productId || "");

  /** Current saved ids, whichever list is active. */
  const savedIds = useMemo(
    () => new Set((user ? items : guestItems).map((item) => item.productId)),
    [guestItems, items, user],
  );

  const isSaved = useCallback(
    (product) => savedIds.has(resolveId(product)),
    [savedIds],
  );

  const toggle = useCallback(
    async (product) => {
      const productId = resolveId(product);
      if (!productId) return false;
      const currentlySaved = savedIds.has(productId);

      if (!user) {
        if (currentlySaved) dispatch(removeGuestWishlistItem(productId));
        else dispatch(addGuestWishlistItem(product));
        return true;
      }

      const result = currentlySaved
        ? await dispatch(removeWishlistItem(productId))
        : await dispatch(addWishlistItem(productId));
      return !result.error;
    },
    [dispatch, savedIds, user],
  );

  const remove = useCallback(
    async (product) => {
      const productId = resolveId(product);
      if (!productId) return false;

      if (!user) {
        dispatch(removeGuestWishlistItem(productId));
        return true;
      }
      const result = await dispatch(removeWishlistItem(productId));
      return !result.error;
    },
    [dispatch, user],
  );

  const clear = useCallback(async () => {
    if (!user) {
      dispatch(clearGuestWishlist());
      return true;
    }
    const result = await dispatch(clearWishlist());
    return !result.error;
  }, [dispatch, user]);

  const refresh = useCallback(async () => {
    if (!user) return;
    if (guestItems.length > 0) {
      await dispatch(mergeGuestWishlist(guestItems));
      return;
    }
    await dispatch(fetchWishlist());
  }, [dispatch, user, guestItems]);

  return useMemo(
    () => ({
      isSignedIn: Boolean(user),
      items,
      guestItems,
      count,
      status,
      loading: status === "loading",
      mutating,
      error,
      isEmpty: items.length === 0,
      isSaved,
      toggle,
      remove,
      clear,
      refresh,
    }),
    [
      user,
      items,
      guestItems,
      count,
      status,
      mutating,
      error,
      isSaved,
      toggle,
      remove,
      clear,
      refresh,
    ],
  );
};

export default useWishlist;
