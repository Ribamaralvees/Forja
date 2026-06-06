import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Forja Fit — Treino & Nutrição com IA",
  description:
    "Seu personal e nutricionista com IA: treinos, dieta, receitas e rotina personalizada.",
  manifest: "/manifest.webmanifest",
  applicationName: "Forja Fit",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Forja Fit",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0c08",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
