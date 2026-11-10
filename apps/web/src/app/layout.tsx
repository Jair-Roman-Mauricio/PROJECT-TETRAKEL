import type { Metadata, Viewport } from "next";
import "./globals.css";
import { QueryScope } from "../components/query-scope";
import { SessionProvider } from "../components/session";
import { InputModality } from "../components/input-modality";
export const metadata: Metadata = {
  title: { default: "Tetrakel", template: "%s | Tetrakel" },
  description: "Gestión de inventario y almacenes",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#05070d",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <InputModality />
        <SessionProvider>
          <QueryScope>{children}</QueryScope>
        </SessionProvider>
      </body>
    </html>
  );
}
