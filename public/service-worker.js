const CACHE_VERSION = '1.3.0.1';
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
  
  // 새 캐시 생성 및 정적 자산 캐싱
  event.waitUntil(
    caches.open(CACHE_NAME)
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
      // 이전 캐시 정리 (현재 캐시는 유지)
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
    // 버전 파라미터만 제거 (다른 쿼리 파라미터는 유지)
    if (urlObj.searchParams.has('v')) {
      urlObj.searchParams.delete('v');
    }
    return urlObj.href;
  })(event.request.url);

  // HTML 파일은 네트워크 우선, 캐시 폴백 전략 사용
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
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // 캐시에 없으면 오프라인 페이지 반환
              return new Response(
                '<html><body><h1>오프라인 상태입니다</h1><p>인터넷 연결을 확인해주세요.</p></body></html>',
                { 
                  status: 503, 
                  headers: { 'Content-Type': 'text/html;charset=utf-8' } 
                }
              );
            });
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

  // 정적 자산은 캐시 우선, 네트워크 폴백 전략 사용
  event.respondWith(
    caches.match(cacheKey)
      .then(cachedResponse => {
        if (cachedResponse) {
          // 캐시된 응답이 있으면 반환하고 백그라운드에서 업데이트 시도
          fetch(event.request)
            .then(networkResponse => {
              if (isValidResponse(networkResponse)) {
                caches.open(CACHE_NAME)
                  .then(cache => cache.put(cacheKey, networkResponse.clone()))
                  .catch(error => console.error('Cache update failed:', error));
              }
            })
            .catch(error => console.error('Background fetch failed:', error));
          
          return cachedResponse;
        }

        // 캐시된 응답이 없으면 네트워크에서 가져오기
        return fetch(event.request)
          .then(networkResponse => {
            if (!isValidResponse(networkResponse)) {
              return networkResponse;
            }

            // 응답을 캐시에 저장하고 반환
            const clonedResponse = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(cacheKey, clonedResponse))
              .catch(error => console.error('Cache put failed:', error));
            
            return networkResponse;
          })
          .catch(error => {
            console.error('Network request failed:', error);
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// 메시지 이벤트 처리 (SKIP_WAITING 메시지 수신 시 즉시 활성화)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Skip waiting message received, activating immediately...');
    self.skipWaiting();
  }
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