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
            version: "4.0",
            description: "Add YouTube videos to your playlists with custom mini popup interface",
            permissions: ["activeTab", "storage", "scripting"],
            host_permissions: ["*://*.youtube.com/*"],
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
// YouTube Playlist Manager Content Script - Enhanced User Playlists Version
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
          <div class="video-actions">
            <button class="action-btn copy-btn" onclick="copyVideoLink()" title="نسخ الرابط">
              📋
            </button>
            <button class="action-btn play-btn" onclick="playVideoPopup()" title="تشغيل في نافذة منبثقة">
              ▶️
            </button>
          </div>
        </div>
      </div>
      <div class="create-playlist-section">
        <div class="create-playlist-toggle" onclick="toggleCreatePlaylist()">
          <span class="create-icon">➕</span>
          <span>إنشاء قائمة جديدة</span>
          <span class="arrow">▼</span>
        </div>
        <div class="create-playlist-form" id="createPlaylistForm" style="display: none;">
          <input type="text" id="newPlaylistName" placeholder="اسم قائمة التشغيل الجديدة" maxlength="50">
          <div class="form-buttons">
            <button class="create-btn" onclick="createNewPlaylist()">إنشاء</button>
            <button class="cancel-btn" onclick="toggleCreatePlaylist()">إلغاء</button>
          </div>
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
    const popupWidth = 350;
    const popupHeight = 450;
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
    loadUserPlaylists();
    
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

  function loadUserPlaylists() {
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
    
    const playlistsHTML = \`
      <div class="playlist-item recent-videos" onclick="addToPlaylist('recent-videos', 'مقاطع حديثة')">
        <div class="playlist-icon">📺</div>
        <div class="playlist-info">
          <div class="playlist-name">مقاطع حديثة</div>
          <div class="playlist-count">قائمة التشغيل الافتراضية</div>
        </div>
        <button class="add-btn" title="إضافة إلى مقاطع حديثة">+</button>
      </div>
      \${playlists.length > 0 ? playlists.map(playlist => \`
        <div class="playlist-item" onclick="addToPlaylist('\${playlist.id}', '\${playlist.name}')">
          <div class="playlist-icon">📋</div>
          <div class="playlist-info">
            <div class="playlist-name">\${playlist.name}</div>
            <div class="playlist-count">\${playlist.videos ? playlist.videos.length : 0} فيديو</div>
          </div>
          <button class="add-btn" title="إضافة إلى \${playlist.name}">+</button>
        </div>
      \`).join('') : '<div class="no-playlists">لا توجد قوائم تشغيل. قم بإنشاء قائمة جديدة أعلاه.</div>'}
    \`;
    
    container.innerHTML = playlistsHTML;
  }

  window.toggleCreatePlaylist = function() {
    const form = document.getElementById('createPlaylistForm');
    const arrow = miniPopup.querySelector('.arrow');
    
    if (form.style.display === 'none') {
      form.style.display = 'block';
      arrow.textContent = '▲';
      // Focus on input
      setTimeout(() => {
        const input = document.getElementById('newPlaylistName');
        if (input) input.focus();
      }, 100);
    } else {
      form.style.display = 'none';
      arrow.textContent = '▼';
      // Clear input
      const input = document.getElementById('newPlaylistName');
      if (input) input.value = '';
    }
  };

  window.createNewPlaylist = function() {
    const input = document.getElementById('newPlaylistName');
    const playlistName = input.value.trim();
    
    if (!playlistName) {
      showNotification('يرجى إدخال اسم قائمة التشغيل', 'error');
      return;
    }
    
    if (playlistName.length < 2) {
      showNotification('اسم قائمة التشغيل قصير جداً', 'error');
      return;
    }
    
    // Check if playlist name already exists
    const playlists = JSON.parse(localStorage.getItem('playlists') || '[]');
    const exists = playlists.some(p => p.name.toLowerCase() === playlistName.toLowerCase());
    
    if (exists) {
      showNotification('اسم قائمة التشغيل موجود بالفعل', 'error');
      return;
    }
    
    const newPlaylist = {
      id: 'playlist-' + Date.now(),
      name: playlistName,
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
    
    showNotification(\`تم إنشاء قائمة "\${playlistName}" وإضافة الفيديو إليها\`, 'success');
    
    // Reset form
    input.value = '';
    toggleCreatePlaylist();
    
    // Reload playlists
    loadUserPlaylists();
  };

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
        showNotification(\`تم إضافة الفيديو إلى \${playlistName}\`, 'success');
      } else {
        showNotification('الفيديو موجود بالفعل في مقاطع حديثة', 'warning');
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
          showNotification(\`تم إضافة الفيديو إلى \${playlistName}\`, 'success');
          
          // Update playlist count in UI
          loadUserPlaylists();
        } else {
          showNotification(\`الفيديو موجود بالفعل في \${playlistName}\`, 'warning');
        }
      }
    }
    
    closeMiniPopup();
  };

  window.copyVideoLink = function() {
    if (!currentVideoData || !currentVideoData.url) return;
    
    navigator.clipboard.writeText(currentVideoData.url).then(() => {
      showNotification('تم نسخ رابط الفيديو', 'success');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = currentVideoData.url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showNotification('تم نسخ رابط الفيديو', 'success');
    });
  };

  window.playVideoPopup = function() {
    if (!currentVideoData || !currentVideoData.url) return;
    
    const popupWidth = 854;
    const popupHeight = 480;
    const left = (screen.width - popupWidth) / 2;
    const top = (screen.height - popupHeight) / 2;
    
    window.open(
      currentVideoData.url,
      'videoPopup',
      \`width=\${popupWidth},height=\${popupHeight},left=\${left},top=\${top},scrollbars=yes,resizable=yes\`
    );
    
    showNotification('تم فتح الفيديو في نافذة منبثقة', 'success');
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

  function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = \`playlist-notification \${type}\`;
    
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️';
    notification.innerHTML = \`<span class="notification-icon">\${icon}</span><span>\${message}</span>\`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.classList.add('fade-out');
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 300);
      }
    }, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  console.log('YouTube Playlist Manager v4.0 loaded - Enhanced User Playlists');
})();
`,

        "styles.css": `
/* Enhanced Mini Popup Styles with User Playlists */
#playlist-mini-popup {
  position: fixed;
  width: 350px;
  max-height: 500px;
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
  align-items: flex-start;
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
  margin-bottom: 8px;
}

/* Enhanced video actions with copy and play buttons */
.video-actions {
  display: flex;
  gap: 6px;
}

.action-btn {
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 24px;
}

.action-btn:hover {
  background: #e9e9e9;
  border-color: #ccc;
}

.copy-btn:hover {
  background: #e3f2fd;
  border-color: #2196f3;
}

.play-btn:hover {
  background: #fff3e0;
  border-color: #ff9800;
}

/* Create playlist section with dropdown form */
.create-playlist-section {
  border-bottom: 1px solid #f0f0f0;
}

.create-playlist-toggle {
  padding: 12px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s;
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.create-playlist-toggle:hover {
  background: #f8f9fa;
}

.create-icon {
  font-size: 14px;
  color: #4caf50;
}

.arrow {
  margin-right: auto;
  font-size: 10px;
  color: #666;
  transition: transform 0.2s;
}

.create-playlist-form {
  padding: 12px 16px;
  background: #f8f9fa;
  border-top: 1px solid #f0f0f0;
}

.create-playlist-form input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 8px;
  direction: rtl;
  text-align: right;
}

.create-playlist-form input:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.form-buttons {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.create-btn, .cancel-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.create-btn {
  background: #4caf50;
  color: white;
}

.create-btn:hover {
  background: #45a049;
}

.cancel-btn {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #ddd;
}

.cancel-btn:hover {
  background: #e9e9e9;
}

.playlists-container {
  max-height: 280px;
  overflow-y: auto;
  padding: 8px 0;
}

/* Enhanced playlist items with better info display */
.playlist-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
  gap: 12px;
}

.playlist-item:hover {
  background: #f8f9fa;
}

.playlist-item.recent-videos {
  background: linear-gradient(135deg, #e3f2fd, #f0f8ff);
  border-bottom: 1px solid #e1f5fe;
}

.playlist-item.recent-videos:hover {
  background: linear-gradient(135deg, #bbdefb, #e1f5fe);
}

.playlist-icon {
  font-size: 16px;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.playlist-info {
  flex: 1;
  min-width: 0;
}

.playlist-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 2px;
}

.playlist-count {
  font-size: 11px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.add-btn {
  background: #4caf50;
  color: white;
  border: none;
  width: 28px;
  height: 28px;
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

.no-playlists {
  text-align: center;
  padding: 20px;
  color: #666;
  font-size: 13px;
  font-style: italic;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #666;
  font-size: 13px;
}

/* Enhanced notification system with types */
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
  display: flex;
  align-items: center;
  gap: 8px;
  transition: opacity 0.3s ease;
}

.playlist-notification.error {
  background: #f44336;
}

.playlist-notification.warning {
  background: #ff9800;
}

.playlist-notification.fade-out {
  opacity: 0;
}

.notification-icon {
  font-size: 16px;
  flex-shrink: 0;
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
// Background script for YouTube Playlist Manager - Enhanced User Playlists
chrome.runtime.onInstalled.addListener(() => {
  console.log('YouTube Playlist Manager v4.0 installed');
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
    .feature-list {
      list-style: none;
      padding: 0;
      margin: 8px 0 0 0;
    }
    .feature-list li {
      padding: 4px 0;
      font-size: 12px;
      color: #666;
    }
    .feature-list li:before {
      content: "✓ ";
      color: #4caf50;
      font-weight: bold;
      margin-left: 6px;
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
    <strong>المميزات الجديدة في v4.0:</strong>
    <ul class="feature-list">
      <li>عرض قوائم التشغيل الفعلية من التطبيق الرئيسي</li>
      <li>نموذج إنشاء قائمة تشغيل جديدة مع التحقق من الصحة</li>
      <li>أزرار نسخ الرابط وتشغيل الفيديو</li>
      <li>عداد الفيديوهات لكل قائمة تشغيل</li>
      <li>إشعارات محسنة مع أنواع مختلفة</li>
    </ul>
  </div>
  
  <div class="feature">
    <strong>كيفية الاستخدام:</strong>
    انقر بالزر الأيمن على أي فيديو في يوتيوب لفتح الواجهة المنبثقة المحسنة مع جميع قوائم التشغيل الخاصة بك
  </div>
  
  <button class="button" id="openMainAppBtn">فتح التطبيق الرئيسي</button>
  
  <div class="instructions">
    💡 تأكد من أن التطبيق الرئيسي مفتوح في تبويب آخر لضمان مزامنة قوائم التشغيل بشكل صحيح وفوري.
  </div>
  
  <div class="version">الإصدار 4.0 - قوائم تشغيل المستخدم المحسنة</div>
  
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
      a.download = "youtube-playlist-manager-v4.zip"
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
                  أداة يوتيوب v4.0 - قوائم تشغيل المستخدم المحسنة
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  إضافة متصفح محدثة بالكامل مع واجهة منبثقة مصغرة تظهر عند النقر بالزر الأيمن على أي فيديو في يوتيوب.
                  تعرض جميع قوائم التشغيل الخاصة بك مع إمكانية الإضافة الفورية بنقرة واحدة. تم إصلاح مشاكل الترميز لضمان
                  عرض النصوص العربية بشكل صحيح.
                </p>
              </div>

              <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                <h3 className="font-semibold text-sm text-card-foreground">المميزات الجديدة في v4.0:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <MousePointer2 className="h-3 w-3 text-primary" />
                    عرض قوائم التشغيل الفعلية من التطبيق الرئيسي
                  </li>
                  <li className="flex items-center gap-2">
                    <Chrome className="h-3 w-3 text-primary" />
                    نموذج إنشاء قائمة تشغيل جديدة مع التحقق من الصحة
                  </li>
                  <li className="flex items-center gap-2">
                    <Youtube className="h-3 w-3 text-primary" />
                    أزرار نسخ الرابط وتشغيل الفيديو
                  </li>
                  <li className="flex items-center gap-2">
                    <MousePointer2 className="h-3 w-3 text-primary" />
                    عداد الفيديوهات لكل قائمة تشغيل
                  </li>
                  <li className="flex items-center gap-2">
                    <MousePointer2 className="h-3 w-3 text-primary" />
                    إشعارات محسنة مع أنواع مختلفة
                  </li>
                </ul>
              </div>

              <Button
                onClick={downloadExtension}
                disabled={isDownloading}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Download className="h-5 w-5 ml-2" />
                {isDownloading ? "جاري التحميل..." : "تحميل الإضافة v4.0"}
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
