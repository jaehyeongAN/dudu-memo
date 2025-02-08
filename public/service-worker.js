const CACHE_NAME = 'doo!du-v250208';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// 캐시 가능한 요청인지 확인하는 함수
function isValidRequestUrl(url) {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol) && 
           !urlObj.href.includes('chrome-extension://');
  } catch {
    return false;
  }
}

// 캐시 가능한 응답인지 확인하는 함수
function isValidResponse(response) {
  return response && 
         response.status === 200 && 
         (response.type === 'basic' || response.type === 'cors');
}

// 설치 시 이전 캐시 즉시 삭제
self.addEventListener('install', (event) => {
  self.skipWaiting(); // 대기 없이 즉시 활성화
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return caches.open(CACHE_NAME);
      })
      .then(cache => {
        return cache.addAll(STATIC_ASSETS);
      })
  );
});

// 활성화 시 클라이언트 강제 새로고침
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // 이전 캐시 정리
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => caches.delete(cacheName))
        );
      }),
      // 모든 클라이언트 새로고침
      self.clients.claim(),
      self.clients.matchAll().then(clients => {
        return Promise.all(
          clients.map(client => client.navigate(client.url))
        );
      })
    ])
  );
});

// 네트워크 요청 처리
self.addEventListener('fetch', (event) => {
  // 유효하지 않은 URL이나 메서드는 무시
  if (!isValidRequestUrl(event.request.url) || event.request.method !== 'GET') {
    return;
  }

  // API 요청은 네트워크 우선
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
        .catch((error) => {
          console.error('API request failed:', error);
          return new Response(JSON.stringify({ error: 'Network error' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // 정적 자산은 캐시 우선
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then((networkResponse) => {
            // 유효하지 않은 응답은 캐시하지 않고 바로 반환
            if (!isValidResponse(networkResponse)) {
              return networkResponse;
            }

            // 응답을 캐시에 저장
            return caches.open(CACHE_NAME)
              .then((cache) => {
                if (isValidRequestUrl(event.request.url)) {
                  cache.put(event.request, networkResponse.clone())
                    .catch((error) => console.error('Cache put failed:', error));
                }
                return networkResponse;
              });
          })
          .catch((error) => {
            console.error('Network request failed:', error);
            // 오프라인이거나 네트워크 오류 시 폴백 응답
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// 푸시 알림 처리
self.addEventListener('push', (event) => {
  const options = {
    body: event.data.text(),
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('Doo!Du', options)
      .catch((error) => console.error('Push notification failed:', error))
  );
});