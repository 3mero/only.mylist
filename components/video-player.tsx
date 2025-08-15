"use client"

import { useState, useEffect, useRef } from "react"
import { Play, Plus, Edit2, Check, X, SkipForward, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { usePlaylist, type Video } from "@/contexts/playlist-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void
    YT: any
  }
}

export function VideoPlayer() {
  const {
    currentVideo,
    playlists,
    playVideo,
    addVideoToPlaylist,
    recentVideos,
    updateVideoTitle,
    getNextVideo,
    getPreviousVideo,
    savePlaybackState,
    deleteCurrentVideo,
    autoDeleteAfterPlayback,
    toggleAutoDeleteAfterPlayback,
    handleVideoCompleted,
    removeFromRecentVideos,
    removeVideoFromPlaylist,
  } = usePlaylist()

  const [videoUrl, setVideoUrl] = useState("")
  const [selectedPlaylist, setSelectedPlaylist] = useState("")
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState("")
  const [countdown, setCountdown] = useState(0)
  const [isVideoEnded, setIsVideoEnded] = useState(false)
  const [player, setPlayer] = useState<any>(null)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [previousVideoForDeletion, setPreviousVideoForDeletion] = useState<Video | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentVideoIdRef = useRef<string | null>(null)

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)

  const extractVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
    const match = url.match(regex)
    return match ? match[1] : null
  }

  const getVideoInfo = async (videoId: string): Promise<Video | null> => {
    try {
      const response = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      )
      if (response.ok) {
        const data = await response.json()
        return {
          id: videoId,
          title: data.title || `Video ${videoId}`,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          addedAt: new Date(),
        }
      }
    } catch (error) {
      console.error("Error fetching video info:", error)
    }

    return {
      id: videoId,
      title: `Video ${videoId}`,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      addedAt: new Date(),
    }
  }

  useEffect(() => {
    const loadYouTubeAPI = () => {
      if (window.YT && !player) {
        initializePlayer()
        return
      }

      if (!window.YT) {
        const script = document.createElement("script")
        script.src = "https://www.youtube.com/iframe_api"
        script.async = true
        document.body.appendChild(script)

        window.onYouTubeIframeAPIReady = () => {
          initializePlayer()
        }
      }
    }

    const initializePlayer = () => {
      if (currentVideo && playerContainerRef.current && window.YT && window.YT.Player && !player) {
        console.log("[v0] Initializing YouTube player for first time")

        // Clear any existing content in the container
        if (playerContainerRef.current) {
          playerContainerRef.current.innerHTML = ""
        }

        try {
          const newPlayer = new window.YT.Player(playerContainerRef.current, {
            height: "360",
            width: "640",
            videoId: currentVideo.id,
            playerVars: {
              autoplay: 1,
              enablejsapi: 1,
              origin: window.location.origin,
            },
            events: {
              onReady: (event: any) => {
                console.log("[v0] YouTube player ready")
                if (event.target && typeof event.target.getPlayerState === "function") {
                  setIsPlayerReady(true)
                  setPlayer(event.target)
                  currentVideoIdRef.current = currentVideo.id
                } else {
                  console.error("[v0] Invalid player object received in onReady")
                }
              },
              onStateChange: (event: any) => {
                console.log("[v0] Player state changed:", event.data)
                if (event.data === 0) {
                  console.log("[v0] Video ended, triggering auto-play")
                  handleVideoEnd()
                }
              },
              onError: (event: any) => {
                console.error("[v0] YouTube player error:", event.data)
                setPlayer(null)
                setIsPlayerReady(false)
              },
            },
          })
        } catch (error) {
          console.error("[v0] Error initializing YouTube player:", error)
          setPlayer(null)
          setIsPlayerReady(false)
        }
      }
    }

    const handleResizeObserverError = (event: ErrorEvent) => {
      if (event.message && event.message.includes("ResizeObserver loop completed")) {
        event.preventDefault()
        event.stopPropagation()
        return false
      }
    }

    window.addEventListener("error", handleResizeObserverError)

    if (currentVideo && !player) {
      loadYouTubeAPI()
    }

    return () => {
      window.removeEventListener("error", handleResizeObserverError)
      if (player && typeof player.destroy === "function" && !currentVideo) {
        try {
          player.destroy()
        } catch (error) {
          console.error("[v0] Error destroying player:", error)
        }
        setPlayer(null)
        setIsPlayerReady(false)
      }
    }
  }, [currentVideo, player])

  useEffect(() => {
    if (player && isPlayerReady && currentVideo && currentVideoIdRef.current !== currentVideo.id) {
      console.log("[v0] Loading new video:", currentVideo.id)

      if (autoDeleteAfterPlayback && previousVideoForDeletion) {
        console.log(
          "[v0] Auto-delete: Removing previous video after next video started:",
          previousVideoForDeletion.title,
        )
        // Delete the previous video from recent videos
        removeFromRecentVideos(previousVideoForDeletion.id)

        // Delete the previous video from all playlists
        playlists.forEach((playlist) => {
          removeVideoFromPlaylist(playlist.id, previousVideoForDeletion.id)
        })

        setPreviousVideoForDeletion(null)
      }

      try {
        if (player && typeof player.loadVideoById === "function" && isPlayerReady) {
          // Check if player has a valid iframe and is not destroyed
          const iframe = player.getIframe && player.getIframe()
          const playerState = player.getPlayerState && player.getPlayerState()

          if (iframe && iframe.src && typeof playerState === "number" && playerState !== -1) {
            console.log("[v0] Player validation passed, loading video")
            player.loadVideoById(currentVideo.id)
            currentVideoIdRef.current = currentVideo.id
          } else {
            console.log("[v0] Player iframe is invalid, reinitializing player")
            // Reset player state to trigger reinitialization
            setPlayer(null)
            setIsPlayerReady(false)
            currentVideoIdRef.current = null
          }
        } else {
          console.error("[v0] Player or loadVideoById method not available")
          // Reset player state to trigger reinitialization
          setPlayer(null)
          setIsPlayerReady(false)
          currentVideoIdRef.current = null
        }
      } catch (error) {
        console.error("[v0] Error loading video:", error)
        // Reset player state to trigger reinitialization
        setPlayer(null)
        setIsPlayerReady(false)
        currentVideoIdRef.current = null
      }
    }
  }, [currentVideo, player, isPlayerReady, autoDeleteAfterPlayback, previousVideoForDeletion])

  useEffect(() => {
    if (currentVideo && recentVideos.length > 1 && isVideoEnded && countdown === 0) {
      const currentIndex = recentVideos.findIndex((video) => video.url === currentVideo.url)
      const isLastVideo = currentIndex === recentVideos.length - 1

      console.log(
        "[v0] Current video index:",
        currentIndex,
        "Is last video:",
        isLastVideo,
        "Auto-delete enabled:",
        autoDeleteAfterPlayback,
      )

      if (isLastVideo) {
        console.log("[v0] End of playlist reached, handling video completion")
        if (autoDeleteAfterPlayback) {
          handleVideoCompleted()
        }
        setIsVideoEnded(false)
        return
      }

      const nextVideo = getNextVideo()
      console.log("[v0] Getting next video:", nextVideo?.title)

      if (nextVideo) {
        if (autoDeleteAfterPlayback) {
          console.log("[v0] Auto-delete enabled: Starting next video immediately")
          setPreviousVideoForDeletion(currentVideo)
          playVideo(nextVideo)
          setIsVideoEnded(false)
          setCountdown(0)
        } else {
          // Normal countdown behavior when auto-delete is disabled
          setCountdown(3)

          countdownIntervalRef.current = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                if (countdownIntervalRef.current) {
                  clearInterval(countdownIntervalRef.current)
                  countdownIntervalRef.current = null
                }
                console.log("[v0] Countdown finished, playing next video")
                playVideo(nextVideo)
                setIsVideoEnded(false)
                return 0
              }
              return prev - 1
            })
          }, 1000)
        }
      } else {
        console.log("[v0] End of playlist reached, no more videos to play")
        setIsVideoEnded(false)
      }
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
    }
  }, [isVideoEnded, currentVideo, recentVideos.length, autoDeleteAfterPlayback, playVideo])

  const handlePlayVideo = async () => {
    const videoId = extractVideoId(videoUrl)
    if (videoId) {
      const videoInfo = await getVideoInfo(videoId)
      if (videoInfo) {
        playVideo(videoInfo)
        setVideoUrl("")
      }
    }
  }

  const handleAddToPlaylist = async () => {
    if (!selectedPlaylist || !videoUrl) return

    const videoId = extractVideoId(videoUrl)
    if (videoId) {
      const videoInfo = await getVideoInfo(videoId)
      if (videoInfo) {
        addVideoToPlaylist(selectedPlaylist, videoInfo)
        setVideoUrl("")
        setSelectedPlaylist("")
      }
    }
  }

  const handleTitleEdit = () => {
    if (isEditingTitle && currentVideo) {
      updateVideoTitle(currentVideo.id, editedTitle)
      setIsEditingTitle(false)
    } else if (currentVideo) {
      setEditedTitle(currentVideo.customTitle || currentVideo.title)
      setIsEditingTitle(true)
    }
  }

  const cancelTitleEdit = () => {
    setIsEditingTitle(false)
    setEditedTitle("")
  }

  const skipToNext = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }

    console.log("[v0] Skipping to next video with auto-delete logic")
    handleVideoCompleted()
    setIsVideoEnded(false)
    setCountdown(0)
  }

  const handleVideoEnd = () => {
    console.log("[v0] Video ended, setting state")
    setIsVideoEnded(true)
    savePlaybackState()
  }

  const handlePreviousVideo = () => {
    const prevVideo = getPreviousVideo()
    if (prevVideo) {
      console.log("[v0] Playing previous video:", prevVideo.title)
      playVideo(prevVideo)
      setIsVideoEnded(false)
      setCountdown(0)
    }
  }

  const handleNextVideo = () => {
    const nextVideo = getNextVideo()
    if (nextVideo) {
      console.log("[v0] Playing next video manually:", nextVideo.title)
      playVideo(nextVideo)
      setIsVideoEnded(false)
      setCountdown(0)
    }
  }

  const handleDeleteCurrentVideo = () => {
    if (currentVideo && window.confirm("هل أنت متأكد من حذف هذا الفيديو من جميع القوائم؟")) {
      deleteCurrentVideo()
    }
  }

  return (
    <div className="space-y-8">
      <Card className="p-8 bg-card/50 backdrop-blur-sm border-border/50 shadow-lg animate-fade-in">
        <h2 className="text-2xl font-semibold mb-6 font-serif text-card-foreground">إضافة فيديو جديد</h2>

        <div className="space-y-6">
          <div className="flex gap-3">
            <Input
              type="url"
              placeholder="الصق رابط فيديو يوتيوب هنا..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="flex-1 h-12 bg-background/50 border-border/50 focus:bg-background focus:border-primary/50 transition-all duration-200 rounded-lg"
            />
            <Button
              onClick={handlePlayVideo}
              className="px-8 h-12 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Play className="h-4 w-4 ml-2" />
              تشغيل
            </Button>
          </div>

          <div className="flex gap-3">
            <Select value={selectedPlaylist} onValueChange={setSelectedPlaylist}>
              <SelectTrigger className="flex-1 h-12 bg-background/50 border-border/50 focus:border-primary/50 transition-all duration-200">
                <SelectValue placeholder="اختر قائمة التشغيل..." />
              </SelectTrigger>
              <SelectContent className="animate-scale-in">
                {playlists.map((playlist) => (
                  <SelectItem
                    key={playlist.id}
                    value={playlist.id}
                    className="hover:bg-accent/50 transition-colors duration-200"
                  >
                    {playlist.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handleAddToPlaylist}
              variant="outline"
              disabled={!selectedPlaylist || !videoUrl}
              className="h-12 px-6 hover:bg-accent/50 transition-all duration-200 border-border/50 bg-transparent"
            >
              <Plus className="h-4 w-4 ml-2" />
              إضافة للقائمة
            </Button>
          </div>
        </div>
      </Card>

      {currentVideo && (
        <Card className="p-8 bg-card/50 backdrop-blur-sm border-border/50 shadow-lg animate-slide-up">
          <div className="aspect-video bg-black rounded-xl mb-6 overflow-hidden relative shadow-2xl">
            <div
              ref={playerContainerRef}
              className="w-full h-full flex items-center justify-center"
              style={{ minHeight: "360px" }}
            />

            {countdown > 0 && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10 animate-fade-in">
                <div className="text-white text-center space-y-6">
                  <div className="text-2xl font-semibold font-serif">الفيديو التالي خلال</div>
                  <div className="text-8xl font-bold bg-gradient-to-br from-white to-gray-300 bg-clip-text text-transparent animate-pulse">
                    {countdown}
                  </div>
                  <Button
                    onClick={skipToNext}
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <SkipForward className="h-5 w-5 ml-2" />
                    تخطي الآن
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3">
              {isEditingTitle ? (
                <>
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="flex-1 h-12 bg-background/50 border-border/50 focus:bg-background focus:border-primary/50 transition-all duration-200"
                    placeholder="عنوان الفيديو..."
                  />
                  <Button
                    size="sm"
                    onClick={handleTitleEdit}
                    className="h-12 w-12 bg-green-600 hover:bg-green-700 transition-all duration-200"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={cancelTitleEdit}
                    className="h-12 w-12 hover:bg-muted/50 transition-all duration-200 bg-transparent"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-semibold flex-1 font-serif text-card-foreground">
                    {currentVideo.customTitle || currentVideo.title}
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTitleEdit}
                    className="h-12 w-12 hover:bg-accent/50 transition-all duration-200 bg-transparent"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            <p className="text-sm text-muted-foreground bg-muted/30 px-4 py-2 rounded-lg inline-block">
              تم الإضافة:{" "}
              {currentVideo.addedAt && typeof currentVideo.addedAt.toLocaleDateString === "function"
                ? currentVideo.addedAt.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : new Date().toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
            </p>

            <div className="flex gap-3 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousVideo}
                disabled={recentVideos.length <= 1}
                className="h-11 px-6 hover:bg-accent/50 transition-all duration-200 border-border/50 bg-transparent"
              >
                السابق
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNextVideo}
                disabled={recentVideos.length <= 1}
                className="h-11 px-6 hover:bg-accent/50 transition-all duration-200 border-border/50 bg-transparent"
              >
                التالي
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={toggleAutoDeleteAfterPlayback}
                className={`h-11 px-6 transition-all duration-200 border-border/50 ${
                  autoDeleteAfterPlayback
                    ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                    : "bg-transparent hover:bg-accent/50"
                }`}
              >
                {autoDeleteAfterPlayback ? "إيقاف الحذف التلقائي" : "تفعيل الحذف التلقائي"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteCurrentVideo}
                className="h-11 px-6 text-destructive hover:text-destructive hover:bg-destructive/10 bg-transparent border-destructive/30 transition-all duration-200"
              >
                <Trash2 className="h-4 w-4 ml-2" />
                حذف الفيديو
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
