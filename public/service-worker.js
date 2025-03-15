const CACHE_VERSION = '1.3.0';
const CACHE_NAME = `doodu-v${CACHE_VERSION}`;
const STATIC_ASSETS = [
  '/',
  `/index.html?v=${CACHE_VERSION}`,
  `/manifest.json?v=${CACHE_VERSION}`,
  `/icons/icon-192x192.png?v=${CACHE_VERSION}`,
  `/icons/icon-512x512.png?v=${CACHE_VERSION}`
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

// 설치 시 정적 자산 캐싱
self.addEventListener('install', (event) => {
  console.log(`Service Worker installing with cache version: ${CACHE_NAME} (${CACHE_VERSION})`);
  
  // 기존 캐시 모두 삭제 후 새로 설치
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      })
      .then(() => caches.open(CACHE_NAME))
      .then(cache => {
        console.log('Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Skip waiting - activating immediately');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service worker installation failed:', error);
      })
  );
});

// 활성화 시 이전 캐시 정리
self.addEventListener('activate', (event) => {
  console.log(`Service Worker activating with cache version: ${CACHE_NAME} (${CACHE_VERSION})`);
  
  event.waitUntil(
    Promise.all([
      // 모든 캐시 스토리지 확인 및 정리
      caches.keys()
        .then(cacheNames => {
          return Promise.all(
            cacheNames
              .filter(cacheName => cacheName !== CACHE_NAME)
              .map(cacheName => {
                console.log(`Deleting old cache: ${cacheName}`);
                return caches.delete(cacheName);
              })
          );
        }),
      // 즉시 모든 클라이언트 제어
      self.clients.claim(),
      // 모든 클라이언트에게 업데이트 알림
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'NEW_VERSION',
            version: CACHE_VERSION,
            timestamp: new Date().toISOString(),
            details: {
              message: '중요 업데이트가 있습니다! 최신 기능과 개선사항을 적용하려면 업데이트하세요.',
              importance: 'critical'
            }
          });
        });
      })
    ])
    .catch(error => {
      console.error('Service worker activation failed:', error);
    })
  );
});

// 네트워크 요청 처리
self.addEventListener('fetch', (event) => {
  // 유효하지 않은 URL이나 메서드는 무시
  if (!isValidRequestUrl(event.request.url) || event.request.method !== 'GET') {
    return;
  }

  // 캐시 키 생성 (쿼리 파라미터 제거)
  const cacheKey = (url => {
    const urlObj = new URL(url);
    // 모든 쿼리 파라미터 제거 (캐시 키 단순화)
    urlObj.search = '';
    return urlObj.href;
  })(event.request.url);

  // HTML 파일은 항상 네트워크에서 가져오기 (캐시 무시)
  if (event.request.url.endsWith('.html') || event.request.url.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // 유효한 응답이면 캐시 업데이트
          if (isValidResponse(response)) {
            const clonedResponse = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(cacheKey, clonedResponse))
              .catch(error => console.error('HTML cache update failed:', error));
          }
          return response;
        })
        .catch(error => {
          console.error('HTML fetch failed, falling back to cache:', error);
          return caches.match(cacheKey)
            .then(cachedResponse => cachedResponse || new Response('Offline', { status: 503 }));
        })
    );
    return;
  }

  // API 요청은 네트워크 우선
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(cacheKey))
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

  // 정적 자산은 캐시 우선, 네트워크 폴백
  event.respondWith(
    caches.match(cacheKey)
      .then(cachedResponse => {
        // 캐시된 응답이 있으면 반환하고 백그라운드에서 업데이트
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            if (isValidResponse(networkResponse)) {
              const clonedResponse = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(cacheKey, clonedResponse))
                .catch(error => console.error('Cache update failed:', error));
            }
            return networkResponse;
          })
          .catch(error => {
            console.error('Network fetch failed:', error);
            return cachedResponse || new Response('Offline', { status: 503 });
          });

        return cachedResponse || fetchPromise;
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