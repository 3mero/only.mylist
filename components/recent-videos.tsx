"use client"

import { useState } from "react"
import { Play, Trash2, Plus, SkipForward, Edit2, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { usePlaylist } from "@/contexts/playlist-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"

export function RecentVideos() {
  const {
    recentVideos,
    playlists,
    playVideo,
    removeFromRecentVideos,
    clearRecentVideos,
    addVideoToPlaylist,
    playNext,
    reorderRecentVideos,
    updateVideoTitle,
  } = usePlaylist()

  const [selectedPlaylistForVideo, setSelectedPlaylistForVideo] = useState<{ [key: string]: string }>({})
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null)
  const [editedTitle, setEditedTitle] = useState("")

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(recentVideos)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    reorderRecentVideos(items)
  }

  const handleAddToPlaylist = (videoId: string, playlistId: string) => {
    const video = recentVideos.find((v) => v.id === videoId)
    if (video) {
      addVideoToPlaylist(playlistId, video)
      setSelectedPlaylistForVideo((prev) => ({ ...prev, [videoId]: "" }))
    }
  }

  const startEditingTitle = (videoId: string, currentTitle: string) => {
    setEditingVideoId(videoId)
    setEditedTitle(currentTitle)
  }

  const saveEditedTitle = (videoId: string) => {
    updateVideoTitle(videoId, editedTitle)
    setEditingVideoId(null)
    setEditedTitle("")
  }

  const cancelEditingTitle = () => {
    setEditingVideoId(null)
    setEditedTitle("")
  }

  if (recentVideos.length === 0) {
    return (
      <Card className="p-12 text-center bg-card/50 backdrop-blur-sm border-border/50 shadow-lg animate-fade-in">
        <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Play className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-lg font-serif">لا توجد فيديوهات حديثة</p>
        <p className="text-sm text-muted-foreground/70 mt-2">ابدأ بإضافة فيديو لرؤيته هنا</p>
      </Card>
    )
  }

  return (
    <Card className="p-8 bg-card/50 backdrop-blur-sm border-border/50 shadow-lg animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold font-serif text-card-foreground">قائمة الانتظار</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={clearRecentVideos}
          className="text-destructive hover:text-destructive bg-transparent hover:bg-destructive/10 border-destructive/30 transition-all duration-200 h-11 px-6"
        >
          <Trash2 className="h-4 w-4 ml-2" />
          مسح الكل
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="recent-videos">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
              {recentVideos.map((video, index) => (
                <Draggable key={video.id} draggableId={video.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`flex items-center gap-6 p-5 bg-background/50 rounded-xl border border-border/50 transition-all duration-200 animate-fade-in ${
                        snapshot.isDragging
                          ? "shadow-2xl scale-105 bg-background border-primary/30"
                          : "hover:bg-accent/30 hover:shadow-lg hover:scale-[1.01]"
                      }`}
                      style={{
                        animationDelay: `${index * 50}ms`,
                        ...provided.draggableProps.style,
                      }}
                    >
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary to-secondary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold shadow-md border-2 border-background">
                        {index + 1}
                      </div>

                      <img
                        src={video.thumbnail || "/placeholder.svg"}
                        alt={video.customTitle || video.title}
                        className="w-28 h-20 object-cover rounded-lg shadow-md transition-transform duration-200 hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg?height=80&width=112"
                        }}
                      />

                      <div className="flex-1 min-w-0">
                        {editingVideoId === video.id ? (
                          <div className="flex items-center gap-3 mb-2">
                            <Input
                              value={editedTitle}
                              onChange={(e) => setEditedTitle(e.target.value)}
                              className="flex-1 h-10 bg-background/50 border-border/50 focus:bg-background focus:border-primary/50 transition-all duration-200"
                              placeholder="عنوان الفيديو..."
                            />
                            <Button
                              size="sm"
                              onClick={() => saveEditedTitle(video.id)}
                              className="h-10 w-10 bg-green-600 hover:bg-green-700 transition-all duration-200"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditingTitle}
                              className="h-10 w-10 hover:bg-muted/50 transition-all duration-200 bg-transparent"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium truncate flex-1 text-lg font-serif">
                              {video.customTitle || video.title}
                            </h3>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditingTitle(video.id, video.customTitle || video.title)}
                              className="h-8 w-8 p-0 hover:bg-accent/50 transition-all duration-200"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground bg-muted/20 px-3 py-1 rounded-full inline-block">
                          موضع في القائمة: {index + 1} •{" "}
                          {new Date(video.addedAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Select
                          value={selectedPlaylistForVideo[video.id] || ""}
                          onValueChange={(value) =>
                            setSelectedPlaylistForVideo((prev) => ({ ...prev, [video.id]: value }))
                          }
                        >
                          <SelectTrigger className="w-36 h-10 bg-background/50 border-border/50 focus:border-primary/50 transition-all duration-200">
                            <SelectValue placeholder="إضافة لقائمة" />
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

                        {selectedPlaylistForVideo[video.id] && (
                          <Button
                            size="sm"
                            onClick={() => handleAddToPlaylist(video.id, selectedPlaylistForVideo[video.id])}
                            className="h-10 w-10 bg-green-600 hover:bg-green-700 transition-all duration-200 shadow-md"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => playNext(video)}
                          className="h-10 w-10 hover:bg-accent/50 transition-all duration-200 border-border/50"
                        >
                          <SkipForward className="h-4 w-4" />
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => playVideo(video)}
                          className="h-10 w-10 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 transition-all duration-200 shadow-md"
                        >
                          <Play className="h-4 w-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFromRecentVideos(video.id)}
                          className="h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </Card>
  )
}
