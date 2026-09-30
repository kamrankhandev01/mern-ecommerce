import { combineReducers, configureStore } from "@reduxjs/toolkit";
import userReducer from "./userSlice";
import cartReducer from "./cartSlice";
import wishlistReducer from "./wishlistSlice";

import {
  persistStore,
  persistReducer,
  createTransform,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import reduxStorage from "redux-persist/lib/storage";

const storage = reduxStorage.default ?? reduxStorage;

/**
 * Only the guest list is persisted from each of the cart and wishlist slices —
 * a signed-in user's data always comes from the server, so caching it locally
 * would risk showing another account's items on a shared device.
 */
const guestOnlyTransform = (slice) =>
  createTransform(
    (inboundState) => ({ guestItems: inboundState?.guestItems || [] }),
    (outboundState) => outboundState,
    { whitelist: [slice] },
  );

const persistConfig = {
  key: "root",
  version: 3,
  storage,
  whitelist: ["user", "cart", "wishlist"],
  transforms: [
    guestOnlyTransform("cart"),
    guestOnlyTransform("wishlist"),
  ],
};

const rootReducer = combineReducers({
  user: userReducer,
  cart: cartReducer,
  wishlist: wishlistReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export default store;

