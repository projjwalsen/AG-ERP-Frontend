"use client";

import * as React from "react";
import { Provider } from "react-redux";
import { store } from "./index";
import { ToastProvider } from "@/components/ui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </Provider>
  );
}