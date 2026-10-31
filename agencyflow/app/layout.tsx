import type { Metadata } from "next";
import "./globals.css";
const origin =
  process.env.NEXT_PUBLIC_AGENCY_URL ||
  "https://agencyflow-studio-dun.vercel.app";
export const metadata: Metadata = {
  creator: "ENOTE-LABS",
  publisher: "ENOTE-LABS",
  metadataBase: new URL(origin),
  title: {
    default: "ProjectFlow — 프로젝트·일정·작업·피드백을 연결하는 PMS",
    template: "%s | ProjectFlow",
  },
  description:
    "다양한 업종의 프로젝트·담당자·일정·작업 진척을 관리하고, 필요한 결과물을 고객과 함께 검토하는 PMS.",
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "ProjectFlow",
    title: "프로젝트의 시작부터 완료까지, 한 흐름으로.",
    description:
      "다양한 업종의 프로젝트·담당자·마감일·작업 진행률과 선택적인 자료 검토를 연결합니다.",
    url: origin,
    images: [
      {
        url: "/og-agencyflow.png",
        width: 1200,
        height: 630,
        alt: "ProjectFlow — 프로젝트·작업·자료 검토를 한곳에",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ProjectFlow — 프로젝트의 시작부터 완료까지.",
    images: ["/og-agencyflow.png"],
  },
  robots: { index: true, follow: true },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
