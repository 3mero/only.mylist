"use client"

import { useState, useEffect } from "react"
import { Search, Menu, Moon, Sun, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { usePlaylist } from "@/contexts/playlist-context"

interface NavbarProps {
  onToggleSidebar: () => void
}

interface SearchResult {
  video: any
  location: string
  playlistName?: string
}

export function Navbar({ onToggleSidebar }: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const { darkMode, toggleDarkMode, playlists, recentVideos, playVideo } = usePlaylist()

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    const results: SearchResult[] = []
    const query = searchQuery.toLowerCase()

    // Search in recent videos
    recentVideos.forEach((video) => {
      const title = (video.customTitle || video.title).toLowerCase()
      if (title.includes(query)) {
        results.push({
          video,
          location: "recent",
        })
      }
    })

    // Search in playlists
    playlists.forEach((playlist) => {
      playlist.videos.forEach((video) => {
        const title = (video.customTitle || video.title).toLowerCase()
        if (title.includes(query)) {
          results.push({
            video,
            location: "playlist",
            playlistName: playlist.name,
          })
        }
      })
    })

    setSearchResults(results.slice(0, 10)) // Limit to 10 results
    setShowResults(results.length > 0)
  }, [searchQuery, recentVideos, playlists])

  const handleResultClick = (result: SearchResult) => {
    playVideo(result.video)
    setSearchQuery("")
    setShowResults(false)
  }

  return (
    <nav className="bg-background/95 backdrop-blur-md border-b border-border/50 px-6 py-4 sticky top-0 z-50 shadow-sm">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="hover:bg-accent/80 transition-all duration-200 hover:scale-105"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">ي</span>
            </div>
            <h1 className="text-xl font-bold text-foreground font-serif">يوتيوب العربي</h1>
          </div>
        </div>

        <div className="flex-1 max-w-2xl mx-8 relative">
          <div className="relative group">
            <Input
              type="text"
              placeholder="البحث في الفيديوهات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
              className="pl-12 pr-4 bg-muted/50 border-border/50 focus:bg-background focus:border-primary/50 transition-all duration-200 rounded-full h-11"
            />
            <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
          </div>

          {showResults && searchResults.length > 0 && (
            <Card className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-md border-border/50 shadow-lg max-h-96 overflow-y-auto z-50 animate-fade-in">
              <div className="p-2">
                {searchResults.map((result, index) => (
                  <div
                    key={`${result.video.id}-${result.location}-${index}`}
                    onClick={() => handleResultClick(result)}
                    className="flex items-center gap-3 p-3 hover:bg-accent/50 rounded-lg cursor-pointer transition-all duration-200 group"
                  >
                    <div className="w-16 h-12 bg-muted rounded-md overflow-hidden flex-shrink-0">
                      <img
                        src={result.video.thumbnail || "/placeholder.svg"}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none"
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors duration-200">
                        {result.video.customTitle || result.video.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {result.location === "recent" ? "الفيديوهات الأخيرة" : `قائمة التشغيل: ${result.playlistName}`}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-8 w-8 p-0"
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            className="hover:bg-accent/80 transition-all duration-200 hover:scale-105 rounded-full"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </nav>
  )
}
