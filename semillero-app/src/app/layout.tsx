import type { Metadata } from "next";
import { MotionConfig } from "framer-motion";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "./globals.css";
import { AppStateProvider } from "@/lib/state/AppStateContext";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";

export const metadata: Metadata = {
  title: "Semillero de Robótica — Explora tu perfil",
  description:
    "Explora, construye y muéstranos cómo piensas. Prueba de ingreso al Semillero de Robótica.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col bg-night text-ink">
        <AuthProvider>
          <AppStateProvider>
            <MotionConfig reducedMotion="user">
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-night focus:outline-2 focus:outline-offset-2 focus:outline-cyan"
            >
              Saltar al contenido
            </a>
            <Navbar />
            <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
              <PageTransition>{children}</PageTransition>
            </main>
            </MotionConfig>
          </AppStateProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
