import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <>
    <App />
    <Toaster
      position="top-right"
      richColors
      closeButton
      expand={false}
      gap={10}
      toastOptions={{
        duration: 4200,
        classNames: {
          toast:
            "rounded-xl border border-slate-200/90 bg-white text-ink-900 shadow-card font-sans",
          title: "font-semibold",
          description: "text-slate-500",
          closeButton:
            "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
        },
      }}
    />
    </>
  </React.StrictMode>
);
