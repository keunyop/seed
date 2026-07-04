import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "sonner";
import { FamilyOpenStoreProvider } from "@/components/domain/use-family-open-store";
import { TeacherAuthProvider } from "@/components/domain/teacher-auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seed 출석부",
  description: "주일학교 교사를 위한 모바일 우선 출석부",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <FamilyOpenStoreProvider>
          <TeacherAuthProvider>{children}</TeacherAuthProvider>
        </FamilyOpenStoreProvider>
        <SpeedInsights />
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
