import { copyFile } from 'node:fs/promises'

// GitHub Pages has no configurable index rewrite. Serving the built app as
// 404.html preserves the requested pathname, allowing BrowserRouter to
// render /play, /game and auth routes after a direct refresh.
await copyFile(new URL('../dist/index.html', import.meta.url), new URL('../dist/404.html', import.meta.url))
