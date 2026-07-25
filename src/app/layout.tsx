import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KickData — API ข้อมูลฟุตบอลสำหรับนักพัฒนา",
  description:
    "KickData คือ API ข้อมูลฟุตบอล — ดึงลีก ทีม นักเตะ และโปรแกรมการแข่งขันด้วยคำขอเดียว เริ่มใช้ฟรี",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
