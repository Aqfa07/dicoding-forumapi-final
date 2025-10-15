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

    // compute reset seconds in current window
    const oldestTs = arr[0] ?? now
    const resetMs = Math.max(0, WINDOW_MS - (now - oldestTs))
    const resetSec = Math.ceil(resetMs / 1000)

    if (arr.length >= MAX_REQUESTS) {
      const resp = h.response({
        status: "fail",
        message: "Terlalu banyak permintaan ke resource threads. Coba lagi nanti.",
      })
      resp.code(429)
      resp.header("Retry-After", resetSec)
      resp.header("X-RateLimit-Limit", String(MAX_REQUESTS))
      resp.header("X-RateLimit-Remaining", "0")
      resp.header("X-RateLimit-Reset", String(resetSec))
      return resp
    }

    arr.push(now)
    buckets.set(key, arr)

    // store rate info to attach on response later
    request.app._threadsRate = {
      limit: MAX_REQUESTS,
      remaining: Math.max(0, MAX_REQUESTS - arr.length),
      reset: resetSec,
    }

    return h.continue
  })

  server.ext("onPreResponse", (request, h) => {
    const info = request.app._threadsRate
    if (!info) return h.continue

    const res = request.response
    // Hapi responses: normal has .header; Boom errors use output.headers
    if (res && typeof res.header === "function") {
      res.header("X-RateLimit-Limit", String(info.limit))
      res.header("X-RateLimit-Remaining", String(info.remaining))
      res.header("X-RateLimit-Reset", String(info.reset))
    } else if (res && res.output && res.output.headers) {
      res.output.headers["X-RateLimit-Limit"] = String(info.limit)
      res.output.headers["X-RateLimit-Remaining"] = String(info.remaining)
      res.output.headers["X-RateLimit-Reset"] = String(info.reset)
    }
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
