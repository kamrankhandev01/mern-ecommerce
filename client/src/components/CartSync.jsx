import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCart,
  mergeGuestCart,
  resetCartState,
  selectCartGuestItems,
} from "../redux/cartSlice";

/**
 * Bridges authentication state and cart storage.
 *
 * - Signing in merges any guest cart, then loads the account cart.
 * - Reloading while signed in simply re-reads the account cart.
 * - Signing out drops the account cart from memory (it stays in the database).
 */
const CartSync = () => {
  const dispatch = useDispatch();
  const userId = useSelector((state) => state.user.user?._id || null);
  const guestItems = useSelector(selectCartGuestItems);
  const mergedFor = useRef(null);
  const syncedFor = useRef(null);
  const previousUserId = useRef(null);

  useEffect(() => {
    const previous = previousUserId.current;
    previousUserId.current = userId;

    if (userId) {
      if (guestItems.length > 0) {
        if (mergedFor.current !== userId) {
          mergedFor.current = userId;
          dispatch(mergeGuestCart(guestItems));
        }
        return;
      }
      if (syncedFor.current !== userId) {
        syncedFor.current = userId;
        dispatch(fetchCart());
      }
      return;
    }

    // Sign-out (not first paint): forget the previous account's cart.
    if (previous) {
      mergedFor.current = null;
      syncedFor.current = null;
      dispatch(resetCartState());
    }
  }, [dispatch, guestItems, userId]);

  return null;
};

export default CartSync;
