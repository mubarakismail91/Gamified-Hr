import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import "./i18n";
import "./index.css";
import { router } from "./router";
import { SessionProvider } from "./context/SessionContext";
import { DemoDataProvider } from "./store/DemoDataContext";
import { TooltipProvider } from "./components/ui/tooltip";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DemoDataProvider>
      <SessionProvider>
        <TooltipProvider delayDuration={200}>
          <RouterProvider router={router} />
          <Toaster position="top-center" richColors closeButton toastOptions={{ duration: 3200 }} />
        </TooltipProvider>
      </SessionProvider>
    </DemoDataProvider>
  </React.StrictMode>,
);
