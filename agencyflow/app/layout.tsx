import type { Metadata } from "next";
import "./globals.css";
const origin =
  process.env.NEXT_PUBLIC_AGENCY_URL || "https://agencyflow-studio-dun.vercel.app";
export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: {
    default: "AgencyFlow — 웹에이전시·디자인 스튜디오의 시안 피드백",
    template: "%s | AgencyFlow",
  },
  description:
    "고객의 수정 요청을 시안 위 핀으로 받고, 대화·처리 상태·버전별 승인까지 연결하세요. 웹에이전시와 디자인 스튜디오를 위한 고객 피드백 협업.",
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
    siteName: "AgencyFlow",
    title: "수정 요청, 이제 같은 화면에서.",
    description:
      "시안 위 피드백부터 버전별 고객 승인까지. 웹에이전시·디자인 스튜디오의 협업 공간.",
    url: origin,
    images: [
      {
        url: "/og-agencyflow.png",
        width: 1200,
        height: 630,
        alt: "AgencyFlow — 시안 위 피드백부터 고객 승인까지",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AgencyFlow — 수정 요청, 이제 같은 화면에서.",
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
