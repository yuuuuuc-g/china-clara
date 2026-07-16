import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "China Clara",
    template: "%s · China Clara",
  },
  description:
    "China, clara. La primera parada de América Latina para entender China y encontrar proveedores confiables.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es" suppressHydrationWarning
      className="h-full antialiased [--font-geist-mono:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace] [--font-geist-sans:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe_UI,sans-serif]"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
