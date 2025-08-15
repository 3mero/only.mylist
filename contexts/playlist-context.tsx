"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export interface Video {
  id: string
  title: string
  url: string
  thumbnail: string
  addedAt: Date
  customTitle?: string
}

export interface Playlist {
  id: string
  name: string
  videos: Video[]
  createdAt: Date
}

interface PlaybackState {
  currentVideoId: string | null
  currentVideoIndex: number
  queueOrder: string[]
  lastPlayedAt: string
}

interface PlaylistContextType {
  playlists: Playlist[]
  currentVideo: Video | null
  recentVideos: Video[]
  currentPlaylist: Playlist | null
  isPlaying: boolean
  darkMode: boolean
  playbackState: PlaybackState
  autoDeleteAfterPlayback: boolean
  createPlaylist: (name: string) => void
  deletePlaylist: (id: string) => void
  renamePlaylist: (id: string, newName: string) => void
  addVideoToPlaylist: (playlistId: string, video: Video) => void
  removeVideoFromPlaylist: (playlistId: string, videoId: string) => void
  addToRecentVideos: (video: Video) => void
  removeFromRecentVideos: (videoId: string) => void
  clearRecentVideos: () => void
  playVideo: (video: Video) => void
  playNext: (video: Video) => void
  addToQueue: (url: string) => Promise<void>
  setCurrentPlaylist: (playlist: Playlist | null) => void
  toggleDarkMode: () => void
  toggleAutoDeleteAfterPlayback: () => void
  reorderPlaylistVideos: (playlistId: string, videos: Video[]) => void
  reorderRecentVideos: (videos: Video[]) => void
  updateVideoTitle: (videoId: string, newTitle: string) => void
  savePlaybackState: () => void
  getNextVideo: () => Video | null
  getPreviousVideo: () => Video | null
  deleteCurrentVideo: () => void
  handleVideoCompleted: () => void
  exportPlaylists: () => void
  importPlaylists: (file: File) => Promise<void>
}

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined)

export function PlaylistProvider({ children }: { children: ReactNode }) {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null)
  const [recentVideos, setRecentVideos] = useState<Video[]>([])
  const [currentPlaylistState, setCurrentPlaylistState] = useState<Playlist | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [autoDeleteAfterPlayback, setAutoDeleteAfterPlayback] = useState(false)
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    currentVideoId: null,
    currentVideoIndex: -1,
    queueOrder: [],
    lastPlayedAt: "",
  })

  useEffect(() => {
    const savedPlaylists = localStorage.getItem("youtube-playlists")
    const savedRecentVideos = localStorage.getItem("youtube-recent-videos")
    const savedDarkMode = localStorage.getItem("youtube-dark-mode")
    const savedPlaybackState = localStorage.getItem("youtube-playback-state")
    const savedAutoDelete = localStorage.getItem("youtube-auto-delete-after-playback")

    if (savedPlaylists) {
      const parsedPlaylists = JSON.parse(savedPlaylists).map((playlist: any) => ({
        ...playlist,
        createdAt: new Date(playlist.createdAt),
        videos: playlist.videos.map((video: any) => ({
          ...video,
          addedAt: new Date(video.addedAt),
        })),
      }))
      setPlaylists(parsedPlaylists)
    }
    if (savedRecentVideos) {
      const videos = JSON.parse(savedRecentVideos).map((video: any) => ({
        ...video,
        addedAt: new Date(video.addedAt),
      }))
      setRecentVideos(videos)
    }
    if (savedDarkMode) {
      setDarkMode(JSON.parse(savedDarkMode))
    }
    if (savedAutoDelete) {
      setAutoDeleteAfterPlayback(JSON.parse(savedAutoDelete))
    }
    if (savedPlaybackState) {
      const state = JSON.parse(savedPlaybackState)
      setPlaybackState(state)

      if (state.currentVideoId && savedRecentVideos) {
        const videos = JSON.parse(savedRecentVideos).map((video: any) => ({
          ...video,
          addedAt: new Date(video.addedAt),
        }))
        const video = videos.find((v: Video) => v.id === state.currentVideoId)
        if (video) {
          setCurrentVideo(video)
        }
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("youtube-playlists", JSON.stringify(playlists))
  }, [playlists])

  useEffect(() => {
    localStorage.setItem("youtube-recent-videos", JSON.stringify(recentVideos))
    setPlaybackState((prev) => ({
      ...prev,
      queueOrder: recentVideos.map((v) => v.id),
    }))
  }, [recentVideos])

  useEffect(() => {
    localStorage.setItem("youtube-dark-mode", JSON.stringify(darkMode))
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [darkMode])

  useEffect(() => {
    localStorage.setItem("youtube-auto-delete-after-playback", JSON.stringify(autoDeleteAfterPlayback))
  }, [autoDeleteAfterPlayback])

  useEffect(() => {
    localStorage.setItem("youtube-playback-state", JSON.stringify(playbackState))
  }, [playbackState])

  const savePlaybackState = () => {
    if (currentVideo) {
      const currentIndex = recentVideos.findIndex((v) => v.id === currentVideo.id)
      const newState: PlaybackState = {
        currentVideoId: currentVideo.id,
        currentVideoIndex: currentIndex,
        queueOrder: recentVideos.map((v) => v.id),
        lastPlayedAt: new Date().toISOString(),
      }
      setPlaybackState(newState)
    }
  }

  const getNextVideo = (): Video | null => {
    if (!currentVideo || recentVideos.length === 0) return null

    const currentIndex = recentVideos.findIndex((v) => v.id === currentVideo.id)
    if (currentIndex >= 0 && currentIndex < recentVideos.length - 1) {
      return recentVideos[currentIndex + 1]
    }
    return null
  }

  const getPreviousVideo = (): Video | null => {
    if (!currentVideo || recentVideos.length === 0) return null

    const currentIndex = recentVideos.findIndex((v) => v.id === currentVideo.id)
    if (currentIndex > 0) {
      return recentVideos[currentIndex - 1]
    }
    return null
  }

  const createPlaylist = (name: string) => {
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name,
      videos: [],
      createdAt: new Date(),
    }
    setPlaylists((prev) => [...prev, newPlaylist])
  }

  const deletePlaylist = (id: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== id))
    if (currentPlaylistState?.id === id) {
      setCurrentPlaylistState(null)
    }
  }

  const renamePlaylist = (id: string, newName: string) => {
    setPlaylists((prev) => prev.map((p) => (p.id === id ? { ...p, name: newName } : p)))
  }

  const addVideoToPlaylist = (playlistId: string, video: Video) => {
    setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? { ...p, videos: [...p.videos, video] } : p)))
  }

  const removeVideoFromPlaylist = (playlistId: string, videoId: string) => {
    setPlaylists((prev) =>
      prev.map((p) => (p.id === playlistId ? { ...p, videos: p.videos.filter((v) => v.id !== videoId) } : p)),
    )
  }

  const addToRecentVideos = (video: Video) => {
    setRecentVideos((prev) => {
      const filtered = prev.filter((v) => v.id !== video.id)
      return [video, ...filtered].slice(0, 20)
    })
  }

  const removeFromRecentVideos = (videoId: string) => {
    setRecentVideos((prev) => prev.filter((v) => v.id !== videoId))
  }

  const clearRecentVideos = () => {
    setRecentVideos([])
  }

  const playVideo = (video: Video) => {
    setCurrentVideo(video)
    setIsPlaying(true)
    addToRecentVideos(video)
    setTimeout(() => savePlaybackState(), 100)
  }

  const playNext = (video: Video) => {
    setRecentVideos((prev) => {
      const filtered = prev.filter((v) => v.id !== video.id)
      const currentIndex = prev.findIndex((v) => v.id === currentVideo?.id)
      if (currentIndex >= 0) {
        return [...prev.slice(0, currentIndex + 1), video, ...filtered.slice(currentIndex + 1)]
      }
      return [video, ...filtered]
    })
  }

  const addToQueue = async (url: string): Promise<void> => {
    try {
      const videoId = extractVideoId(url)
      if (!videoId) {
        throw new Error("Invalid YouTube URL")
      }

      // Check if video already exists in recent videos
      const existingVideo = recentVideos.find((v) => v.id === videoId)
      if (existingVideo) {
        throw new Error("Video already exists in queue")
      }

      // Fetch video details from YouTube oEmbed API
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      const response = await fetch(oembedUrl)

      if (!response.ok) {
        throw new Error("Failed to fetch video details")
      }

      const data = await response.json()

      const newVideo: Video = {
        id: videoId,
        title: data.title || "Unknown Title",
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        addedAt: new Date(),
      }

      // Add to recent videos (queue)
      setRecentVideos((prev) => [...prev, newVideo])
    } catch (error) {
      throw error
    }
  }

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return match[1]
      }
    }

    return null
  }

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev)
  }

  const toggleAutoDeleteAfterPlayback = () => {
    setAutoDeleteAfterPlayback((prev) => !prev)
  }

  const reorderPlaylistVideos = (playlistId: string, videos: Video[]) => {
    setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? { ...p, videos } : p)))
  }

  const reorderRecentVideos = (videos: Video[]) => {
    setRecentVideos(videos)
  }

  const updateVideoTitle = (videoId: string, newTitle: string) => {
    setRecentVideos((prev) => prev.map((v) => (v.id === videoId ? { ...v, customTitle: newTitle } : v)))

    setPlaylists((prev) =>
      prev.map((playlist) => ({
        ...playlist,
        videos: playlist.videos.map((v) => (v.id === videoId ? { ...v, customTitle: newTitle } : v)),
      })),
    )

    if (currentVideo?.id === videoId) {
      setCurrentVideo((prev) => (prev ? { ...prev, customTitle: newTitle } : null))
    }
  }

  const deleteCurrentVideo = () => {
    if (!currentVideo) return

    removeFromRecentVideos(currentVideo.id)

    setPlaylists((prev) =>
      prev.map((playlist) => ({
        ...playlist,
        videos: playlist.videos.filter((v) => v.id !== currentVideo.id),
      })),
    )

    const nextVideo = getNextVideo()
    if (nextVideo && nextVideo.id !== currentVideo.id) {
      setCurrentVideo(nextVideo)
    } else {
      const prevVideo = getPreviousVideo()
      if (prevVideo && prevVideo.id !== currentVideo.id) {
        setCurrentVideo(prevVideo)
      } else {
        setCurrentVideo(null)
        setIsPlaying(false)
      }
    }
  }

  const handleVideoCompleted = () => {
    if (!currentVideo) return

    if (autoDeleteAfterPlayback) {
      removeFromRecentVideos(currentVideo.id)

      setPlaylists((prev) =>
        prev.map((playlist) => ({
          ...playlist,
          videos: playlist.videos.filter((v) => v.id !== currentVideo.id),
        })),
      )

      const nextVideo = getNextVideo()
      if (nextVideo && nextVideo.id !== currentVideo.id) {
        setCurrentVideo(nextVideo)
      } else {
        setCurrentVideo(null)
        setIsPlaying(false)
      }
    } else {
      const nextVideo = getNextVideo()
      if (nextVideo) {
        setCurrentVideo(nextVideo)
      } else {
        setIsPlaying(false)
      }
    }
  }

  const exportPlaylists = () => {
    const dataToExport = {
      playlists,
      recentVideos,
      exportedAt: new Date().toISOString(),
      version: "1.0",
    }

    const dataStr = JSON.stringify(dataToExport, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })

    const link = document.createElement("a")
    link.href = URL.createObjectURL(dataBlob)
    link.download = `youtube-playlists-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const importPlaylists = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          const importedData = JSON.parse(content)

          if (importedData.playlists && Array.isArray(importedData.playlists)) {
            const processedPlaylists = importedData.playlists.map((playlist: any) => ({
              ...playlist,
              id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              createdAt: new Date(playlist.createdAt),
              videos: playlist.videos.map((video: any) => ({
                ...video,
                addedAt: new Date(video.addedAt),
              })),
            }))

            setPlaylists((prev) => [...prev, ...processedPlaylists])

            if (importedData.recentVideos && Array.isArray(importedData.recentVideos)) {
              const processedRecentVideos = importedData.recentVideos.map((video: any) => ({
                ...video,
                addedAt: new Date(video.addedAt),
              }))

              setRecentVideos((prev) => {
                const existingIds = new Set(prev.map((v) => v.id))
                const newVideos = processedRecentVideos.filter((v: Video) => !existingIds.has(v.id))
                return [...prev, ...newVideos].slice(0, 20)
              })
            }

            resolve()
          } else {
            reject(new Error("Invalid file format"))
          }
        } catch (error) {
          reject(new Error("Failed to parse JSON file"))
        }
      }

      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsText(file)
    })
  }

  return (
    <PlaylistContext.Provider
      value={{
        playlists,
        currentVideo,
        recentVideos,
        currentPlaylist: currentPlaylistState,
        isPlaying,
        darkMode,
        playbackState,
        autoDeleteAfterPlayback,
        createPlaylist,
        deletePlaylist,
        renamePlaylist,
        addVideoToPlaylist,
        removeVideoFromPlaylist,
        addToRecentVideos,
        removeFromRecentVideos,
        clearRecentVideos,
        playVideo,
        playNext,
        addToQueue,
        setCurrentPlaylist: setCurrentPlaylistState,
        toggleDarkMode,
        toggleAutoDeleteAfterPlayback,
        reorderPlaylistVideos,
        reorderRecentVideos,
        updateVideoTitle,
        savePlaybackState,
        getNextVideo,
        getPreviousVideo,
        deleteCurrentVideo,
        handleVideoCompleted,
        exportPlaylists,
        importPlaylists,
      }}
    >
      {children}
    </PlaylistContext.Provider>
  )
}

export function usePlaylist() {
  const context = useContext(PlaylistContext)
  if (context === undefined) {
    throw new Error("usePlaylist must be used within a PlaylistProvider")
  }
  return context
}
