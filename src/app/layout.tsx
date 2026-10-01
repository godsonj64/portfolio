import type { Metadata, Viewport } from "next";
import { Manrope, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Loader } from "@/components/Loader";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { RevealObserver } from "@/components/RevealObserver";
import { site } from "@/content/site";
import { ogImage } from "@/lib/art";

const sans = Manrope({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.title, template: `%s — ${site.name}` },
  description: site.description,
  openGraph: {
    type: "website",
    siteName: site.name,
    title: site.title,
    description: site.description,
    images: [{ url: ogImage, width: 1200, height: 630, alt: "Cicada, Timbre, ElectroPlate, AXIO Medical and Talenta" }],
  },
  twitter: { card: "summary_large_image", title: site.title, description: site.description, images: [ogImage] },
};

export const viewport: Viewport = { themeColor: "#050507", colorScheme: "dark" };

// Runs before first paint: marks JS as available and decides whether the loader should show at all.
const boot = `(function(){var d=document.documentElement;d.classList.add('js');try{if(sessionStorage.getItem('gj-loaded')){d.classList.add('no-loader')}else{d.classList.add('loading')}}catch(e){d.classList.add('no-loader')}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: boot }} />
      </head>
      <body>
        <a href="#main" className="skip">Skip to content</a>
        <Loader />
        <Nav />
        <main id="main">{children}</main>
        <Footer />
        <RevealObserver />
      </body>
    </html>
  );
}
