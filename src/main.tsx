import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import "./i18n";
import "./index.css";
import { router } from "./router";
import { AuthProvider } from "./context/AuthContext";
import { SessionProvider } from "./context/SessionContext";
import { DemoDataProvider } from "./store/DemoDataContext";
import { TooltipProvider } from "./components/ui/tooltip";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DemoDataProvider>
          <SessionProvider>
            <TooltipProvider delayDuration={200}>
              <RouterProvider router={router} />
              <Toaster position="top-center" richColors closeButton toastOptions={{ duration: 3200 }} />
            </TooltipProvider>
          </SessionProvider>
        </DemoDataProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
