import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import usersReducer from "./usersSlice";
import purchasesReducer from "./purchasesSlice";
import salesReducer from "./salesSlice";
import transactionsReducer from "./transactionsSlice";
import inventoryReducer from "./inventorySlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer,
    purchases: purchasesReducer,
    sales: salesReducer,
    transactions: transactionsReducer,
    inventory: inventoryReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;