// adapted from https://dev.to/stefnotch/enabling-coop-coep-without-touching-the-server-2d3n

self.addEventListener("install", (evt) => {
  self.skipWaiting();
});

self.addEventListener("activate", (evt) => {
  evt.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (evt) => {
  if (
    evt.request.cache === "only-if-cached" &&
    evt.request.mode !== "same-origin"
  ) {
    return;
  }

  evt.respondWith(
    fetch(evt.request)
      .then((response) => {
        const newHeaders = new Headers(response.headers);
        newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");
        newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      })
      .catch((e) => {
        console.error(e);
      })
  );
});
