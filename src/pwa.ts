export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('ServiceWorker registered: ', registration);
        })
        .catch((error) => {
          console.log('ServiceWorker registration failed: ', error);
        });
    });
  }
}

export function checkInstallable() {
  let deferredPrompt: any;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // 설치 버튼 표시 이벤트 발생
    const event = new CustomEvent('pwaInstallable');
    window.dispatchEvent(event);
  });

  return {
    isInstallable: () => !!deferredPrompt,
    install: async () => {
      if (!deferredPrompt) return false;

      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      
      return outcome === 'accepted';
    }
  };
}