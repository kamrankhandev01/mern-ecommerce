import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchWishlist,
  mergeGuestWishlist,
  resetWishlistState,
  selectWishlistGuestItems,
} from "../redux/wishlistSlice";

/**
 * Bridges authentication state and wishlist storage.
 *
 * Deliberately identical in shape to `CartSync`: signing in merges any guest
 * list then loads the account list, and signing out drops the account list from
 * memory while leaving it in the database.
 */
const WishlistSync = () => {
  const dispatch = useDispatch();
  const userId = useSelector((state) => state.user.user?._id || null);
  const guestItems = useSelector(selectWishlistGuestItems);
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
          dispatch(mergeGuestWishlist(guestItems));
        }
        return;
      }
      if (syncedFor.current !== userId) {
        syncedFor.current = userId;
        dispatch(fetchWishlist());
      }
      return;
    }

    // Sign-out (not first paint): forget the previous account's list.
    if (previous) {
      mergedFor.current = null;
      syncedFor.current = null;
      dispatch(resetWishlistState());
    }
  }, [dispatch, guestItems, userId]);

  return null;
};

export default WishlistSync;
