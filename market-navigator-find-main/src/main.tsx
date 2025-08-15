import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);

// PWA service worker handling with instant update support
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        console.log('[PWA] Service worker registered');
        
        // Listen for updates and reload immediately
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New version available, reloading...');
                window.location.reload();
              }
            });
          }
        });
      }).catch((err) => {
        console.warn('[PWA] Service worker registration failed:', err);
      });
      
      // Listen for SW messages about updates
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATED') {
          console.log('[PWA] SW updated, reloading for latest version...');
          window.location.reload();
        }
      });
    });
  } else {
    // Dev mode: unregister any existing SWs and clear caches to prevent stale content
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => reg.unregister());
      console.log('[PWA] Dev mode: unregistered existing service workers');
    }).catch(() => {});
    if ('caches' in window) {
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(() => {
        console.log('[PWA] Dev mode: cleared caches');
      }).catch(() => {});
    }
  }
}
