import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

// The Content-Security-Policy of the built admin console. Scripts come only from this
// site, so a script injected into a page does not run; connections go only to this site
// and the API. Images may come from any https host (avatars). Styles allow inline style
// attributes, which the UI components set. It is added to the build only: the dev server
// runs an inline script for hot reload. As a <meta> tag it works on any static host;
// frame-ancestors cannot be set this way, so a host that can send headers should also
// send "Content-Security-Policy: frame-ancestors 'none'".
function contentSecurityPolicy(apiOrigin) {
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https:",
    `connect-src 'self' ${apiOrigin}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ")
  return {
    name: "admin-content-security-policy",
    apply: "build",
    transformIndexHtml: () => [
      { tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: policy }, injectTo: "head-prepend" },
    ],
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, "VITE_")
  const apiOrigin = new URL(env.VITE_API_URL || "http://localhost:8081").origin
  return {
    resolve: {
      alias: {
        "@": path.resolve(projectRoot, "src"),
      },
    },
    plugins: [react(), tailwindcss(), contentSecurityPolicy(apiOrigin)],
  }
})
