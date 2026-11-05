import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mr. Johns",
  description: "Gestión de personal, stock y propinas de Mr. Johns",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" suppressHydrationWarning className="h-full">
      <head>
        {/* Misma tipografía que el sistema viejo. El link en el layout raíz aplica a todas las páginas. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;600;700&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        {/* Oscuro por defecto, como antes. next-themes guarda la elección y
            la aplica antes de pintar, así no hay flash del tema incorrecto. */}
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="temaMrJohns">
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
