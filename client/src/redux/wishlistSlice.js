import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../lib/api";

/**
 * Wishlist state.
 *
 * Mirrors the cart: signing in swaps the browser-local guest list for the
 * account's server list, and the guest list is folded in on login. `items` is
 * always the *display* list; `guestItems` is the only thing persisted locally.
 */

const initialState = {
  items: [],
  guestItems: [],
  status: "idle",
  mutating: false,
  error: "",
  lastSyncedAt: null,
};

const messageFrom = (error, fallback) =>
  error.response?.data?.message || error.message || fallback;

/* ------------------------------------------------------------------ thunks */

export const fetchWishlist = createAsyncThunk(
  "wishlist/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/api/wishlist");
      return data.wishlist;
    } catch (error) {
      return rejectWithValue(messageFrom(error, "Could not load your wishlist."));
    }
  },
);

export const addWishlistItem = createAsyncThunk(
  "wishlist/addItem",
  async (productId, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/api/wishlist/items", { productId });
      return data.wishlist;
    } catch (error) {
      return rejectWithValue(messageFrom(error, "Could not save that item."));
    }
  },
);

export const removeWishlistItem = createAsyncThunk(
  "wishlist/removeItem",
  async (productId, { rejectWithValue }) => {
    try {
      const { data } = await api.delete(`/api/wishlist/items/${productId}`);
      return data.wishlist;
    } catch (error) {
      return rejectWithValue(
        messageFrom(error, "Could not update your wishlist."),
      );
    }
  },
);

export const clearWishlist = createAsyncThunk(
  "wishlist/clear",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.delete("/api/wishlist");
      return data.wishlist;
    } catch (error) {
      return rejectWithValue(
        messageFrom(error, "Could not clear your wishlist."),
      );
    }
  },
);

export const mergeGuestWishlist = createAsyncThunk(
  "wishlist/merge",
  async (guestItems, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/api/wishlist/merge", {
        items: guestItems,
      });
      return data.wishlist;
    } catch (error) {
      return rejectWithValue(
        messageFrom(error, "Could not restore your saved items."),
      );
    }
  },
);

/* ------------------------------------------------------------- local state */

/** Shape a product for local (guest) storage. */
const toGuestItem = (product) => ({
  productId: String(product._id || product.productId),
  name: product.name,
  category: product.category || "",
  price: Number(product.price) || 0,
  stock: Number(product.stock) || 0,
  image: product.images?.find((image) => image.url)?.url || product.image || "",
});

const applyServerWishlist = (state, payload) => {
  state.items = payload?.items || [];
  state.status = "ready";
  state.lastSyncedAt = Date.now();
  state.error = "";
};

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState,
  reducers: {
    addGuestWishlistItem: (state, action) => {
      const productId = String(action.payload?._id || action.payload?.productId);
      if (!productId) return;
      if (state.guestItems.some((item) => item.productId === productId)) return;
      state.guestItems.push(toGuestItem(action.payload));
    },
    removeGuestWishlistItem: (state, action) => {
      const productId = String(action.payload);
      state.guestItems = state.guestItems.filter(
        (item) => item.productId !== productId,
      );
    },
    clearGuestWishlist: (state) => {
      state.guestItems = [];
    },
    resetWishlistState: () => ({ ...initialState }),
    resetWishlistError: (state) => {
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWishlist.pending, (state) => {
        if (state.status !== "ready") state.status = "loading";
        state.error = "";
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        applyServerWishlist(state, action.payload);
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.status = "error";
        state.error = action.payload || "Could not load your wishlist.";
      })

      .addCase(addWishlistItem.pending, (state) => {
        state.mutating = true;
        state.error = "";
      })
      .addCase(addWishlistItem.fulfilled, (state, action) => {
        state.mutating = false;
        applyServerWishlist(state, action.payload);
      })
      .addCase(addWishlistItem.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload || "Could not save that item.";
      })

      .addCase(removeWishlistItem.pending, (state) => {
        state.mutating = true;
        state.error = "";
      })
      .addCase(removeWishlistItem.fulfilled, (state, action) => {
        state.mutating = false;
        applyServerWishlist(state, action.payload);
      })
      .addCase(removeWishlistItem.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload || "Could not update your wishlist.";
      })

      .addCase(clearWishlist.fulfilled, (state, action) => {
        state.mutating = false;
        applyServerWishlist(state, action.payload);
      })
      .addCase(clearWishlist.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload || "Could not clear your wishlist.";
      })

      .addCase(mergeGuestWishlist.pending, (state) => {
        state.mutating = true;
      })
      .addCase(mergeGuestWishlist.fulfilled, (state, action) => {
        state.mutating = false;
        state.guestItems = [];
        applyServerWishlist(state, action.payload);
      })
      .addCase(mergeGuestWishlist.rejected, (state, action) => {
        state.mutating = false;
        state.status = "error";
        state.error = action.payload || "Could not restore your saved items.";
      });
  },
});

export const {
  addGuestWishlistItem,
  removeGuestWishlistItem,
  clearGuestWishlist,
  resetWishlistState,
  resetWishlistError,
} = wishlistSlice.actions;

export const selectWishlistItems = (state) => state.wishlist?.items || [];
export const selectWishlistGuestItems = (state) =>
  state.wishlist?.guestItems || [];
export const selectWishlistCount = (state) =>
  (state.wishlist?.items?.length ?? 0) ||
  (state.wishlist?.guestItems?.length ?? 0);
export const selectWishlistStatus = (state) => state.wishlist?.status || "idle";

export default wishlistSlice.reducer;
