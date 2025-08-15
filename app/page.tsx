"use client"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Sidebar } from "@/components/sidebar"
import { VideoPlayer } from "@/components/video-player"
import { RecentVideos } from "@/components/recent-videos"
import { PlaylistProvider } from "@/contexts/playlist-context"

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <PlaylistProvider>
      <div className="min-h-screen bg-background" dir="rtl">
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex justify-center">
          <div className="w-full max-w-6xl flex">
            <Sidebar isOpen={sidebarOpen} />

            <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? "mr-64" : "mr-0"}`}>
              <div className="p-4 max-w-4xl mx-auto">
                <VideoPlayer />
                <RecentVideos />
              </div>
            </main>
          </div>
        </div>
      </div>
    </PlaylistProvider>
  )
}
