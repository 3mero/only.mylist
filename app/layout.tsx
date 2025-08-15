import type React from "react"
import type { Metadata } from "next"
import { Geist, Manrope } from "next/font/google"
import "./globals.css"

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
})

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
})

export const metadata: Metadata = {
  title: "قوائم التشغيل التلقائية لليوتيوب - مشغل الفيديوهات المتقدم",
  description: "مشغل فيديوهات يوتيوب متقدم مع إدارة قوائم التشغيل التلقائية",
  generator: "v0.app",
  icons: {
    icon: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/icon16-m2akPXgXr1HbmpbUG62jquO2aPVVB2.png",
    shortcut: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/icon16-m2akPXgXr1HbmpbUG62jquO2aPVVB2.png",
    apple: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/icon16-m2akPXgXr1HbmpbUG62jquO2aPVVB2.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" className={`${geist.variable} ${manrope.variable} antialiased`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
