"use client"

import { useState } from "react"
import { Download, Chrome, Youtube, MousePointer2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"

export default function AddonsPage() {
  const [isDownloading, setIsDownloading] = useState(false)

  const downloadExtension = async () => {
    setIsDownloading(true)

    try {
      const JSZipModule = (await import("jszip")).default

      // Create the extension files as a ZIP
      const extensionFiles = {
        "manifest.json": JSON.stringify(
          {
            manifest_version: 3,
            name: "YouTube Playlist Manager",
            version: "3.0",
            description: "Add YouTube videos to your playlists with custom mini popup interface",
            permissions: ["activeTab", "storage"],
            content_scripts: [
              {
                matches: ["*://*.youtube.com/*"],
                js: ["content.js"],
                css: ["styles.css"],
              },
            ],
            background: {
              service_worker: "background.js",
            },
            action: {
              default_popup: "popup.html",
              default_title: "YouTube Playlist Manager",
            },
            icons: {
              "16": "icon16.png",
              "48": "icon48.png",
              "128": "icon128.png",
            },
            web_accessible_resources: [
              {
                resources: ["mini-popup.html"],
                matches: ["*://*.youtube.com/*"],
              },
            ],
          },
          null,
          2,
        ),

        "content.js": `
// YouTube Playlist Manager Content Script - Mini Popup Version
(function() {
  'use strict';

  let miniPopup = null;
  let currentVideoData = null;

  function initializeRightClickDetection() {
    // Remove any existing listeners
    document.removeEventListener('contextmenu', handleRightClick, true);
    
    // Add right-click listener to the document
    document.addEventListener('contextmenu', handleRightClick, true);
    
    console.log('[YouTube Extension] Right-click detection initialized');
  }

  function handleRightClick(event) {
    // Find the closest video element
    const videoElement = findVideoElement(event.target);
    
    if (videoElement) {
      event.preventDefault(); // Prevent default context menu
      event.stopPropagation();
      
      const videoData = extractVideoData(videoElement);
      if (videoData) {
        console.log('[YouTube Extension] Video detected:', videoData.title);
        showMiniPopup(event.clientX, event.clientY, videoData);
      }
    }
  }

  function findVideoElement(target) {
    // Check multiple selectors for different YouTube layouts
    const videoSelectors = [
      'ytd-video-renderer',
      'ytd-compact-video-renderer', 
      'ytd-grid-video-renderer',
      'ytd-rich-item-renderer',
      'ytd-video-meta-block',
      'ytd-thumbnail',
      '#dismissible',
      '.ytd-video-renderer',
      '.ytd-compact-video-renderer'
    ];
    
    let element = target;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (element && element !== document && attempts < maxAttempts) {
      // Check if current element matches any video selector
      for (const selector of videoSelectors) {
        if (element.matches && element.matches(selector)) {
          return element;
        }
      }
      
      // Check if element contains video-related classes or attributes
      if (element.className && typeof element.className === 'string') {
        if (element.className.includes('video') || 
            element.className.includes('ytd-') ||
            element.hasAttribute('data-context-item-id')) {
          return element;
        }
      }
      
      element = element.parentElement;
      attempts++;
    }
    
    return null;
  }

  function extractVideoData(videoElement) {
    try {
      let videoId = null;
      let title = 'فيديو يوتيوب';
      let thumbnail = null;
      let url = null;
      
      // Try to get video ID from various sources
      const linkElement = videoElement.querySelector('a[href*="/watch?v="]') || 
                         videoElement.querySelector('a[href*="/shorts/"]');
      
      if (linkElement) {
        const href = linkElement.getAttribute('href');
        if (href) {
          if (href.includes('/watch?v=')) {
            videoId = href.split('v=')[1]?.split('&')[0];
          } else if (href.includes('/shorts/')) {
            videoId = href.split('/shorts/')[1]?.split('?')[0];
          }
          
          if (videoId) {
            url = \`https://www.youtube.com/watch?v=\${videoId}\`;
          }
        }
      }
      
      // Try to get title
      const titleElement = videoElement.querySelector('#video-title') ||
                          videoElement.querySelector('.ytd-video-meta-block #video-title') ||
                          videoElement.querySelector('a[title]') ||
                          videoElement.querySelector('h3 a') ||
                          videoElement.querySelector('[aria-label]');
      
      if (titleElement) {
        title = titleElement.getAttribute('title') || 
                titleElement.getAttribute('aria-label') || 
                titleElement.textContent?.trim() || 
                title;
      }
      
      // Try to get thumbnail
      const thumbnailElement = videoElement.querySelector('img') ||
                              videoElement.querySelector('ytd-thumbnail img');
      
      if (thumbnailElement) {
        thumbnail = thumbnailElement.src || thumbnailElement.getAttribute('data-src');
      }
      
      // Generate thumbnail URL from video ID if not found
      if (!thumbnail && videoId) {
        thumbnail = \`https://img.youtube.com/vi/\${videoId}/mqdefault.jpg\`;
      }
      
      if (videoId && url) {
        return {
          id: videoId,
          title: title.substring(0, 100), // Limit title length
          url: url,
          thumbnail: thumbnail
        };
      }
      
    } catch (error) {
      console.error('[YouTube Extension] Error extracting video data:', error);
    }
    
    return null;
  }

  function initialize() {
    initializeRightClickDetection();
    
    // Re-initialize when YouTube navigates (SPA behavior)
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        setTimeout(initializeRightClickDetection, 1000);
      }
    }).observe(document, { subtree: true, childList: true });
  }

  // Create mini popup HTML
  function createMiniPopup() {
    const popup = document.createElement('div');
    popup.id = 'playlist-mini-popup';
    popup.innerHTML = \`
      <div class="popup-header">
        <h3>إضافة إلى قائمة التشغيل</h3>
        <button class="close-btn" onclick="closeMiniPopup()">×</button>
      </div>
      <div class="video-info">
        <img class="video-thumbnail" src="/placeholder.svg" alt="Video thumbnail">
        <div class="video-details">
          <div class="video-title"></div>
        </div>
      </div>
      <div class="playlists-container">
        <div class="loading">جاري تحميل قوائم التشغيل...</div>
      </div>
    \`;
    
    document.body.appendChild(popup);
    return popup;
  }

  // Show mini popup at cursor position
  function showMiniPopup(x, y, videoData) {
    if (miniPopup) {
      miniPopup.remove();
    }
    
    miniPopup = createMiniPopup();
    currentVideoData = videoData;
    
    // Position popup with better boundary checking
    const popupWidth = 320;
    const popupHeight = 400;
    const margin = 10;
    
    let left = Math.min(x, window.innerWidth - popupWidth - margin);
    let top = Math.min(y, window.innerHeight - popupHeight - margin);
    
    // Ensure popup doesn't go off-screen
    left = Math.max(margin, left);
    top = Math.max(margin, top);
    
    miniPopup.style.left = left + 'px';
    miniPopup.style.top = top + 'px';
    
    // Update video info
    const thumbnail = miniPopup.querySelector('.video-thumbnail');
    const title = miniPopup.querySelector('.video-title');
    
    thumbnail.src = videoData.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNDUiIHZpZXdCb3g9IjAgMCA2MCA0NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjQ1IiBmaWxsPSIjZjBmMGYwIi8+CjxwYXRoIGQ9Ik0yNCAzMEwyNCAyMEwzMiAyNUwyNCAzMFoiIGZpbGw9IiNjY2MiLz4KPC9zdmc+';
    title.textContent = videoData.title;
    
    // Load playlists
    loadPlaylists();
    
    // Show popup with animation
    setTimeout(() => {
      miniPopup.classList.add('show');
    }, 10);
  }

  // Close mini popup
  window.closeMiniPopup = function() {
    if (miniPopup) {
      miniPopup.classList.remove('show');
      setTimeout(() => {
        if (miniPopup && miniPopup.parentNode) {
          miniPopup.parentNode.removeChild(miniPopup);
          miniPopup = null;
        }
      }, 200);
    }
  };

  function loadPlaylists() {
    const container = miniPopup.querySelector('.playlists-container');
    
    // Get playlists from localStorage (synced with main app)
    const storedPlaylists = localStorage.getItem('playlists');
    
    let playlists = [];
    
    if (storedPlaylists) {
      try {
        const playlistData = JSON.parse(storedPlaylists);
        playlists = playlistData || [];
      } catch (e) {
        console.error('Error parsing playlists:', e);
      }
    }
    
    // Add "Recent Videos" as first option
    const playlistsHTML = \`
      <div class="playlist-item" onclick="addToPlaylist('recent-videos', 'مقاطع حديثة')">
        <div class="playlist-icon">📺</div>
        <div class="playlist-name">مقاطع حديثة</div>
        <button class="add-btn">+</button>
      </div>
      \${playlists.map(playlist => \`
        <div class="playlist-item" onclick="addToPlaylist('\${playlist.id}', '\${playlist.name}')">
          <div class="playlist-icon">📋</div>
          <div class="playlist-name">\${playlist.name}</div>
          <button class="add-btn">+</button>
        </div>
      \`).join('')}
      <div class="playlist-item create-new" onclick="createNewPlaylist()">
        <div class="playlist-icon">➕</div>
        <div class="playlist-name">إنشاء قائمة جديدة</div>
        <button class="add-btn">+</button>
      </div>
    \`;
    
    container.innerHTML = playlistsHTML;
  }

  // Add video to playlist and sync with main app
  window.addToPlaylist = function(playlistId, playlistName) {
    if (!currentVideoData) return;
    
    // Add to recent videos if that's selected
    if (playlistId === 'recent-videos') {
      const recentVideos = JSON.parse(localStorage.getItem('recentVideos') || '[]');
      
      // Check for duplicates
      const exists = recentVideos.some(video => video.url === currentVideoData.url);
      if (!exists) {
        const newVideo = {
          ...currentVideoData,
          addedAt: new Date().toISOString(),
          customTitle: currentVideoData.title
        };
        recentVideos.unshift(newVideo);
        localStorage.setItem('recentVideos', JSON.stringify(recentVideos));
        
        syncWithMainApp('ADD_TO_RECENT', newVideo);
      }
    } else {
      // Add to specific playlist
      const playlists = JSON.parse(localStorage.getItem('playlists') || '[]');
      const playlist = playlists.find(p => p.id === playlistId);
      
      if (playlist) {
        const exists = playlist.videos.some(video => video.url === currentVideoData.url);
        if (!exists) {
          const newVideo = {
            ...currentVideoData,
            addedAt: new Date().toISOString(),
            customTitle: currentVideoData.title
          };
          playlist.videos.push(newVideo);
          localStorage.setItem('playlists', JSON.stringify(playlists));
          
          syncWithMainApp('ADD_TO_PLAYLIST', { playlistId, video: newVideo });
        }
      }
    }
    
    // Show success notification
    showNotification(\`تم إضافة الفيديو إلى \${playlistName}\`);
    closeMiniPopup();
  };

  // Create new playlist and sync with main app
  window.createNewPlaylist = function() {
    const playlistName = prompt('اسم قائمة التشغيل الجديدة:');
    if (playlistName && playlistName.trim()) {
      const playlists = JSON.parse(localStorage.getItem('playlists') || '[]');
      const newPlaylist = {
        id: 'playlist-' + Date.now(),
        name: playlistName.trim(),
        videos: [
          {
            ...currentVideoData,
            addedAt: new Date().toISOString(),
            customTitle: currentVideoData.title
          }
        ],
        createdAt: new Date().toISOString()
      };
      
      playlists.push(newPlaylist);
      localStorage.setItem('playlists', JSON.stringify(playlists));
      
      syncWithMainApp('CREATE_PLAYLIST', newPlaylist);
      
      showNotification(\`تم إنشاء قائمة "\${playlistName}" وإضافة الفيديو إليها\`);
      closeMiniPopup();
    }
  };

  function syncWithMainApp(action, data) {
    try {
      // Use Chrome extension messaging for internal communication
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          action: 'syncWithMainApp',
          type: action,
          data: data
        }).catch(e => {
          console.log('Chrome extension messaging not available:', e);
        });
      }
      
      // Set a flag in localStorage to indicate data has been updated
      localStorage.setItem('extensionDataUpdated', Date.now().toString());
      
    } catch (e) {
      console.log('Sync attempt completed with localStorage fallback');
    }
  }

  function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'playlist-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  console.log('YouTube Playlist Manager v3.0 loaded - Right-click detection active');
})();
`,

        "styles.css": `
/* Mini Popup Styles */
#playlist-mini-popup {
  position: fixed;
  width: 320px;
  max-height: 400px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  z-index: 999999;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  direction: rtl;
  text-align: right;
  opacity: 0;
  transform: scale(0.9) translateY(-10px);
  transition: all 0.2s ease;
  border: 1px solid #e0e0e0;
  overflow: hidden;
}

#playlist-mini-popup.show {
  opacity: 1;
  transform: scale(1) translateY(0);
}

.popup-header {
  background: linear-gradient(135deg, #ff4444, #cc0000);
  color: white;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.popup-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.video-info {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  gap: 12px;
  align-items: center;
}

.video-thumbnail {
  width: 60px;
  height: 45px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}

.video-details {
  flex: 1;
  min-width: 0;
}

.video-title {
  font-size: 12px;
  font-weight: 500;
  color: #333;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.playlists-container {
  max-height: 280px;
  overflow-y: auto;
  padding: 8px 0;
}

.playlist-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.2s;
  gap: 12px;
}

.playlist-item:hover {
  background: #f8f9fa;
}

.playlist-item.create-new {
  border-top: 1px solid #f0f0f0;
  color: #666;
}

.playlist-icon {
  font-size: 16px;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.playlist-name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: #333;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.add-btn {
  background: #4caf50;
  color: white;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.add-btn:hover {
  background: #45a049;
  transform: scale(1.1);
}

.loading {
  text-align: center;
  padding: 20px;
  color: #666;
  font-size: 13px;
}

/* Notification Styles */
.playlist-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #4caf50;
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  z-index: 1000000;
  animation: slideIn 0.3s ease;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  max-width: 300px;
  word-wrap: break-word;
  direction: rtl;
  text-align: right;
}

@keyframes slideIn {
  from { 
    transform: translateX(100%); 
    opacity: 0;
  }
  to { 
    transform: translateX(0); 
    opacity: 1;
  }
}

/* Scrollbar styling for popup */
.playlists-container::-webkit-scrollbar {
  width: 6px;
}

.playlists-container::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.playlists-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.playlists-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
`,

        "background.js": `
// Background script for YouTube Playlist Manager - Mini Popup Version
chrome.runtime.onInstalled.addListener(() => {
  console.log('YouTube Playlist Manager v3.0 installed');
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'syncPlaylists') {
    // Handle playlist synchronization if needed
    sendResponse({ success: true });
  }
});
`,

        "popup.html": `<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>مدير قوائم تشغيل يوتيوب</title>
  <style>
    body { 
      width: 320px; 
      padding: 20px; 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      direction: rtl;
      text-align: right;
      margin: 0;
      background: #f8f9fa;
    }
    h2 { 
      color: #333; 
      margin: 0 0 15px 0; 
      font-size: 18px;
      font-weight: 600;
    }
    .status { 
      padding: 12px; 
      background: linear-gradient(135deg, #e3f2fd, #f0f8ff);
      border-radius: 8px; 
      margin-bottom: 15px;
      border-right: 4px solid #2196f3;
      font-size: 14px;
      color: #1565c0;
    }
    .feature {
      padding: 12px;
      background: white;
      border-radius: 8px;
      margin-bottom: 12px;
      font-size: 13px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      border: 1px solid #e0e0e0;
    }
    .feature strong {
      color: #333;
      display: block;
      margin-bottom: 6px;
    }
    .button { 
      background: linear-gradient(135deg, #ff4444, #cc0000);
      color: white; 
      border: none; 
      padding: 14px 20px; 
      border-radius: 8px; 
      cursor: pointer; 
      width: 100%;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(255, 68, 68, 0.3);
    }
    .button:hover { 
      background: linear-gradient(135deg, #cc0000, #990000);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(255, 68, 68, 0.4);
    }
    .instructions {
      font-size: 12px;
      color: #666;
      margin-top: 15px;
      line-height: 1.5;
      background: #fff3cd;
      padding: 10px;
      border-radius: 6px;
      border: 1px solid #ffeaa7;
    }
    .version {
      text-align: center;
      font-size: 11px;
      color: #999;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <h2>مدير قوائم تشغيل يوتيوب</h2>
  
  <div class="status">
    ✅ الإضافة نشطة ومتصلة بيوتيوب
  </div>
  
  <div class="feature">
    <strong>الميزات الجديدة:</strong>
    واجهة منبثقة مصغرة تظهر عند النقر بالزر الأيمن على أي فيديو في يوتيوب مع عرض جميع قوائم التشغيل المتاحة
  </div>
  
  <div class="feature">
    <strong>كيفية الاستخدام:</strong>
    انقر بالزر الأيمن على أي فيديو في يوتيوب لفتح الواجهة المنبثقة واختيار قائمة التشغيل المطلوبة
  </div>
  
  <button class="button" id="openMainAppBtn">فتح التطبيق الرئيسي</button>
  
  <div class="instructions">
    💡 تأكد من أن التطبيق الرئيسي مفتوح في تبويب آخر لضمان مزامنة قوائم التشغيل بشكل صحيح وفوري.
  </div>
  
  <div class="version">الإصدار 3.0 - واجهة منبثقة محسنة</div>
  
  <script src="popup.js"></script>
</body>
</html>`,

        "popup.js": `
// Popup script for YouTube Playlist Manager
document.addEventListener('DOMContentLoaded', function() {
  const openMainAppBtn = document.getElementById('openMainAppBtn');
  
  if (openMainAppBtn) {
    openMainAppBtn.addEventListener('click', function() {
      chrome.tabs.create({ url: 'https://onlymylist-beryl.vercel.app/' });
    });
  }
});
`,
      }

      const iconFiles = {
        "icon16.png":
          "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/icon16-i7ZNZitMAUMGYNFh9DNOodGXPQ02uF.png",
        "icon48.png":
          "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/icon48-Lo23XxlhHFgCuUkUEFzilaK3twPaFq.png",
        "icon128.png":
          "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/icon128-oc2yQUl3w1MzITeynrfDI7NTb0la0G.png",
      }

      // Create and download ZIP file
      const zip = new JSZipModule()

      // Add text files
      Object.entries(extensionFiles).forEach(([filename, content]) => {
        zip.file(filename, content)
      })

      // Add icon files
      for (const [filename, url] of Object.entries(iconFiles)) {
        try {
          const response = await fetch(url)
          const blob = await response.blob()
          zip.file(filename, blob)
        } catch (error) {
          console.error(`Error loading icon ${filename}:`, error)
        }
      }

      const content = await zip.generateAsync({ type: "blob" })
      const url = URL.createObjectURL(content)
      const a = document.createElement("a")
      a.href = url
      a.download = "youtube-playlist-manager-v3.zip"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error creating extension package:", error)
      alert("حدث خطأ أثناء إنشاء حزمة الإضافة. يرجى المحاولة مرة أخرى.")
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-accent/20 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="outline" size="sm" className="h-10 w-10 p-0 bg-transparent">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold font-serif bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            الإضافات والأدوات
          </h1>
        </div>

        {/* YouTube Tool Card */}
        <Card className="p-8 bg-card/50 backdrop-blur-sm border-border/50 shadow-lg">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-red-100 rounded-xl">
              <Youtube className="h-8 w-8 text-red-600" />
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl font-semibold font-serif text-card-foreground mb-2">
                  أداة يوتيوب v3.0 - واجهة منبثقة مصغرة
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  إضافة متصفح محدثة بالكامل مع واجهة منبثقة مصغرة تظهر عند النقر بالزر الأيمن على أي فيديو في يوتيوب.
                  تعرض جميع قوائم التشغيل الخاصة بك مع إمكانية الإضافة الفورية بنقرة واحدة. تم إصلاح مشاكل الترميز لضمان
                  عرض النصوص العربية بشكل صحيح.
                </p>
              </div>

              <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                <h3 className="font-semibold text-sm text-card-foreground">المميزات الجديدة في v3.0:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <MousePointer2 className="h-3 w-3 text-primary" />
                    واجهة منبثقة مصغرة تظهر عند النقر بالزر الأيمن
                  </li>
                  <li className="flex items-center gap-2">
                    <Chrome className="h-3 w-3 text-primary" />
                    عرض مصغرات الفيديوهات وتفاصيلها في الواجهة
                  </li>
                  <li className="flex items-center gap-2">
                    <Youtube className="h-3 w-3 text-primary" />
                    إصلاح مشاكل ترميز النصوص العربية (UTF-8)
                  </li>
                  <li className="flex items-center gap-2">
                    <MousePointer2 className="h-3 w-3 text-primary" />
                    إمكانية إنشاء قوائم تشغيل جديدة مباشرة من الواجهة
                  </li>
                </ul>
              </div>

              <Button
                onClick={downloadExtension}
                disabled={isDownloading}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Download className="h-5 w-5 ml-2" />
                {isDownloading ? "جاري التحميل..." : "تحميل الإضافة v3.0"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Installation Instructions */}
        <Card className="p-6 bg-card/30 backdrop-blur-sm border-border/30">
          <h3 className="text-lg font-semibold font-serif mb-4 text-card-foreground">تعليمات التثبيت والاستخدام</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3 text-card-foreground">التثبيت:</h4>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-semibold">
                    1
                  </span>
                  <span>قم بتحميل ملف الإضافة من الزر أعلاه</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-semibold">
                    2
                  </span>
                  <span>استخرج الملفات من الأرشيف المضغوط</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-semibold">
                    3
                  </span>
                  <span>افتح Chrome واذهب إلى chrome://extensions/</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-semibold">
                    4
                  </span>
                  <span>فعّل "وضع المطور" واضغط "تحميل غير مضغوط"</span>
                </li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-card-foreground">الاستخدام الجديد:</h4>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-secondary/20 text-secondary rounded-full flex items-center justify-center text-xs font-semibold">
                    1
                  </span>
                  <span>اذهب إلى يوتيوب وافتح أي صفحة</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-secondary/20 text-secondary rounded-full flex items-center justify-center text-xs font-semibold">
                    2
                  </span>
                  <span>انقر بالزر الأيمن على أي فيديو</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-secondary/20 text-secondary rounded-full flex items-center justify-center text-xs font-semibold">
                    3
                  </span>
                  <span>ستظهر واجهة منبثقة مع قوائم التشغيل</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-secondary/20 text-secondary rounded-full flex items-center justify-center text-xs font-semibold">
                    4
                  </span>
                  <span>اضغط على زر "+" بجانب القائمة المطلوبة</span>
                </li>
              </ol>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
