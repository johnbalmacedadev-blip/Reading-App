import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { router } from "./routes";
import { LanguageProvider } from "./i18n";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            style: { fontFamily: "inherit" },
          }}
        />
      </AuthProvider>
    </LanguageProvider>
  );
}