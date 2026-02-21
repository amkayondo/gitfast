import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GitHub Uganda User Finder",
  description:
    "Discover GitHub users in Uganda — search, filter, and download JSON/CSV.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
