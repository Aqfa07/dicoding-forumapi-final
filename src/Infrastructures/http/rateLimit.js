/**
 * In-memory sliding window rate limiter per IP for all routes starting with '/threads'.
 * Defaults: 90 requests per 60 seconds.
 * Automatically disabled when NODE_ENV === 'test'.
 *
 * To override via env:
 * - RATE_LIMIT_MAX (default 90)
 * - RATE_LIMIT_WINDOW_MS (default 60000)
 * - RATE_LIMIT_ENABLED ("false" to disable)
 */
const WINDOW_MS = Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10) // 60s
const MAX_REQUESTS = Number.parseInt(process.env.RATE_LIMIT_MAX || "90", 10)

const buckets = new Map() // key `${ip}:threads` => number[] timestamps (ms)

function pruneOld(timestamps, now) {
  const cutoff = now - WINDOW_MS
  while (timestamps.length && timestamps[0] <= cutoff) {
    timestamps.shift()
  }
}

function registerThreadsRateLimit(server) {
  const enabled = process.env.NODE_ENV !== "test" && (process.env.RATE_LIMIT_ENABLED || "true") !== "false"
  if (!enabled) return

  server.ext("onPreAuth", (request, h) => {
    const path = request.path || ""
    if (!path.startsWith("/threads")) return h.continue

    const ip = request.info?.remoteAddress || "unknown"
    const key = `${ip}:threads`
    const now = Date.now()

    const arr = buckets.get(key) || []
    pruneOld(arr, now)

    if (arr.length >= MAX_REQUESTS) {
      const resp = h.response({
        status: "fail",
        message: "Terlalu banyak permintaan ke resource threads. Coba lagi nanti.",
      })
      resp.code(429)
      resp.header("Retry-After", Math.ceil(WINDOW_MS / 1000))
      return resp
    }

    arr.push(now)
    buckets.set(key, arr)

    return h.continue
  })

  // basic cleanup to avoid unbounded memory growth
  const CLEAN_INTERVAL = 60_000
  setInterval(() => {
    const now = Date.now()
    for (const [key, arr] of buckets.entries()) {
      pruneOld(arr, now)
      if (arr.length === 0) buckets.delete(key)
    }
  }, CLEAN_INTERVAL).unref?.()
}

module.exports = { registerThreadsRateLimit }
