import "./globals.css";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <div
          className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/chinchilla.webp)" }}
        />
        <div className="fixed inset-0 -z-10 bg-black/35" />
        {children}
      </body>
    </html>
  );
}
