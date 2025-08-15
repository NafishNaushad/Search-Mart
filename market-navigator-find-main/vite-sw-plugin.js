// Vite plugin to inject build timestamp into service worker
export function swTimestampPlugin() {
  return {
    name: 'sw-timestamp',
    generateBundle(options, bundle) {
      const swFile = bundle['sw.js'];
      if (swFile && swFile.type === 'asset') {
        const timestamp = Date.now();
        swFile.source = swFile.source.replace(
          '__BUILD_TIMESTAMP__',
          timestamp.toString()
        );
        console.log(`[SW Plugin] Injected timestamp: ${timestamp}`);
      }
    }
  };
}
