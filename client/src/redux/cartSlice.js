import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../lib/api";
import { MAX_QUANTITY_PER_ITEM, summarise } from "../lib/pricing";

/**
 * Cart state.
 *
 * Signing in switches the cart from a browser-local guest cart to the account's
 * server cart. `items` is always the *display* cart; `guestItems` is the only
 * thing persisted to storage, and it is folded into the server cart on login.
 */

const emptyTotals = {
  subtotal: 0,
  shipping: 0,
  total: 0,
  itemCount: 0,
  currency: "USD",
  freeShippingThreshold: 75,
  maxQuantityPerItem: MAX_QUANTITY_PER_ITEM,
};

const initialState = {
  items: [],
  guestItems: [],
  totals: emptyTotals,
  // "idle" until the cart has been loaded for the current auth state.
  status: "idle",
  mutating: false,
  error: "",
  lastSyncedAt: null,
};

const messageFrom = (error, fallback) =>
  error.response?.data?.message || error.message || fallback;

const clamp = (quantity, stock) =>
  Math.max(
    1,
    Math.min(
      Math.trunc(Number(quantity) || 1),
      Number(stock) > 0 ? Number(stock) : MAX_QUANTITY_PER_ITEM,
      MAX_QUANTITY_PER_ITEM,
    ),
  );

/** Shape a product for local (guest) storage. */
const toGuestItem = (product, quantity) => ({
  productId: String(product._id || product.productId),
  name: product.name,
  category: product.category || "",
  price: Number(product.price) || 0,
  stock: Number(product.stock) || 0,
  image: product.images?.find((image) => image.url)?.url || product.image || "",
  quantity: clamp(quantity, product.stock),
});

const upsertGuestItem = (guestItems, product, quantity) => {
  const productId = String(product._id || product.productId);
  const existing = guestItems.find((item) => item.productId === productId);
  if (existing) {
    existing.quantity = clamp(existing.quantity + quantity, product.stock);
    return guestItems;
  }
  guestItems.push(toGuestItem(product, quantity));
  return guestItems;
};

/* ------------------------------------------------------------------ thunks */

export const fetchCart = createAsyncThunk(
  "cart/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/api/cart");
      return data.cart;
    } catch (error) {
      return rejectWithValue(messageFrom(error, "Could not load your cart."));
    }
  },
);

export const addCartItem = createAsyncThunk(
  "cart/addItem",
  async ({ productId, quantity = 1 }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/api/cart/items", {
        productId,
        quantity,
      });
      return data.cart;
    } catch (error) {
      return rejectWithValue(
        messageFrom(error, "Could not add that item to your cart."),
      );
    }
  },
);

export const updateCartItem = createAsyncThunk(
  "cart/updateItem",
  async ({ productId, quantity }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/api/cart/items/${productId}`, {
        quantity,
      });
      return data.cart;
    } catch (error) {
      if (error.response?.data?.cart) {
        // Out-of-stock responses still return the corrected cart.
        return rejectWithValue({
          message: messageFrom(error, "Could not update your cart."),
          cart: error.response.data.cart,
        });
      }
      return rejectWithValue(
        messageFrom(error, "Could not update your cart."),
      );
    }
  },
);

export const removeCartItem = createAsyncThunk(
  "cart/removeItem",
  async (productId, { rejectWithValue }) => {
    try {
      const { data } = await api.delete(`/api/cart/items/${productId}`);
      return data.cart;
    } catch (error) {
      return rejectWithValue(
        messageFrom(error, "Could not update your cart."),
      );
    }
  },
);

export const clearCart = createAsyncThunk(
  "cart/clear",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.delete("/api/cart");
      return data.cart;
    } catch (error) {
      return rejectWithValue(messageFrom(error, "Could not empty your cart."));
    }
  },
);

export const mergeGuestCart = createAsyncThunk(
  "cart/mergeGuest",
  async (items, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/api/cart/merge", {
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      });
      return data.cart;
    } catch (error) {
      return rejectWithValue(
        messageFrom(error, "Could not restore your saved cart."),
      );
    }
  },
);

/* ------------------------------------------------------------------- slice */

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addGuestItem: (state, action) => {
      const { product, quantity = 1 } = action.payload;
      if (!product) return;
      upsertGuestItem(state.guestItems, product, quantity);
      state.items = state.guestItems;
      state.totals = summarise(state.items);
      state.error = "";
    },
    setGuestItemQuantity: (state, action) => {
      const { productId, quantity } = action.payload;
      const item = state.guestItems.find(
        (entry) => entry.productId === productId,
      );
      if (!item) return;
      const next = Math.trunc(Number(quantity) || 0);
      if (next < 1) {
        state.guestItems = state.guestItems.filter(
          (entry) => entry.productId !== productId,
        );
      } else {
        item.quantity = clamp(next, item.stock);
      }
      state.items = state.guestItems;
      state.totals = summarise(state.items);
      state.error = "";
    },
    removeGuestItem: (state, action) => {
      state.guestItems = state.guestItems.filter(
        (entry) => entry.productId !== action.payload,
      );
      state.items = state.guestItems;
      state.totals = summarise(state.items);
    },
    clearGuestCart: (state) => {
      state.guestItems = [];
      state.items = [];
      state.totals = emptyTotals;
    },
    /** Called on sign-out: the account cart lives on the server, not here. */
    resetCartState: (state) => {
      state.items = [];
      state.guestItems = [];
      state.totals = emptyTotals;
      state.status = "idle";
      state.error = "";
    },
    resetCartError: (state) => {
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    const applyServerCart = (state, cart) => {
      if (!cart) return;
      state.items = cart.items || [];
      state.totals = {
        subtotal: cart.subtotal || 0,
        shipping: cart.shipping || 0,
        total: cart.total || 0,
        itemCount: cart.itemCount || 0,
        currency: cart.currency || "USD",
        freeShippingThreshold:
          cart.freeShippingThreshold ?? emptyTotals.freeShippingThreshold,
        maxQuantityPerItem:
          cart.maxQuantityPerItem ?? emptyTotals.maxQuantityPerItem,
      };
      state.status = "ready";
      state.lastSyncedAt = Date.now();
      state.error = "";
    };

    builder
      .addCase(fetchCart.pending, (state) => {
        if (state.status !== "ready") state.status = "loading";
        state.error = "";
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        applyServerCart(state, action.payload);
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.status = "error";
        state.error = action.payload || "Could not load your cart.";
      })

      .addCase(addCartItem.pending, (state) => {
        state.mutating = true;
        state.error = "";
      })
      .addCase(addCartItem.fulfilled, (state, action) => {
        state.mutating = false;
        applyServerCart(state, action.payload);
      })
      .addCase(addCartItem.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload || "Could not add that item.";
      })

      .addCase(updateCartItem.pending, (state) => {
        state.mutating = true;
        state.error = "";
      })
      .addCase(updateCartItem.fulfilled, (state, action) => {
        state.mutating = false;
        applyServerCart(state, action.payload);
      })
      .addCase(updateCartItem.rejected, (state, action) => {
        state.mutating = false;
        if (action.payload?.cart) {
          applyServerCart(state, action.payload.cart);
        }
        state.error =
          action.payload?.message || "Could not update your cart.";
      })

      .addCase(removeCartItem.fulfilled, (state, action) => {
        applyServerCart(state, action.payload);
      })
      .addCase(removeCartItem.rejected, (state, action) => {
        state.error = action.payload || "Could not update your cart.";
      })

      .addCase(clearCart.fulfilled, (state, action) => {
        if (action.payload) applyServerCart(state, action.payload);
        else {
          state.items = [];
          state.totals = emptyTotals;
        }
      })

      .addCase(mergeGuestCart.pending, (state) => {
        state.mutating = true;
      })
      .addCase(mergeGuestCart.fulfilled, (state, action) => {
        state.mutating = false;
        state.guestItems = [];
        applyServerCart(state, action.payload);
      })
      .addCase(mergeGuestCart.rejected, (state, action) => {
        state.mutating = false;
        state.status = "error";
        state.error = action.payload || "Could not restore your saved cart.";
      });
  },
});

export const {
  addGuestItem,
  setGuestItemQuantity,
  removeGuestItem,
  clearGuestCart,
  resetCartState,
  resetCartError,
} = cartSlice.actions;

export const selectCartItems = (state) => state.cart?.items || [];
export const selectCartTotals = (state) => state.cart?.totals || emptyTotals;
export const selectCartGuestItems = (state) => state.cart?.guestItems || [];
export const selectCartCount = (state) =>
  (state.cart?.totals?.itemCount ?? 0) ||
  (state.cart?.items || []).reduce((total, item) => total + item.quantity, 0);
export const selectCartStatus = (state) => state.cart?.status || "idle";

export default cartSlice.reducer;
