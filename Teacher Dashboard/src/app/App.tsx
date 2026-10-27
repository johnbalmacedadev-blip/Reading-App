import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { router } from "./routes";
import { LanguageProvider } from "./i18n";
import { AuthProvider } from "./context/AuthContext";
import { BrandingProvider } from "./context/BrandingContext";

export default function App() {
  return (
    <LanguageProvider>
      <BrandingProvider>
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
      </BrandingProvider>
    </LanguageProvider>
  );
}