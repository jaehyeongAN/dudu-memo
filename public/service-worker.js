const CACHE_NAME = 'v250315';
const STATIC_ASSETS = [
  '/',
  '/index.html?v=250315',
  '/manifest.json?v=250315',
  '/icons/icon-192x192.png?v=250315',
  '/icons/icon-512x512.png?v=250315'
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
  console.log('Service Worker installing with cache version:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => {
        // 새 서비스 워커가 대기 상태를 건너뛰고 즉시 활성화되도록 함
        return self.skipWaiting();
      })
      .catch((error) => console.error('Cache installation failed:', error))
  );
});

// 활성화 시 이전 캐시 정리
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating with cache version:', CACHE_NAME);
  event.waitUntil(
    Promise.all([
      // 이전 캐시 정리
      caches.keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames
              .filter((name) => name !== CACHE_NAME)
              .map((name) => {
                console.log('Deleting old cache:', name);
                return caches.delete(name);
              })
          );
        }),
      // 활성화 즉시 모든 클라이언트 제어 (페이지 새로고침 없이 새 서비스 워커 사용)
      self.clients.claim()
    ])
    .catch((error) => console.error('Cache cleanup failed:', error))
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
    // 버전 파라미터(v=)가 있는 경우 캐시 키에서 제거
    if (urlObj.searchParams.has('v')) {
      urlObj.searchParams.delete('v');
    }
    return urlObj.href;
  })(event.request.url);

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
                  // 원본 요청 URL이 아닌 쿼리 파라미터가 제거된 URL로 캐시
                  const clonedResponse = networkResponse.clone();
                  const requestToCache = new Request(cacheKey);
                  cache.put(requestToCache, clonedResponse)
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