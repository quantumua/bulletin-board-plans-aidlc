// NFR1.6: log-in latency against the running app, as the NFR states it:
// "50 sequential log-ins against the running app", warmed up with at least 10 prior requests.
// Target: p50 <= 400 ms and p95 <= 600 ms.
//
//   node nfr1-6-login-latency.mjs [baseUrl]
//
// Exits 1 when the target is missed. Prints one NFR-MEASURE line.

const base = (process.argv[2] ?? 'http://localhost:8080').replace(/\/$/, '')
const jar = {}

async function send(method, path, body) {
  const headers = { Cookie: Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ') }
  if (body) headers['Content-Type'] = 'application/json'
  if (method !== 'GET') headers['X-XSRF-TOKEN'] = jar['XSRF-TOKEN']
  const response = await fetch(base + path, { method, headers, body: body && JSON.stringify(body) })
  for (const sc of response.headers.getSetCookie()) {
    const [pair] = sc.split(';')
    const eq = pair.indexOf('=')
    const value = pair.slice(eq + 1).trim()
    if (value) jar[pair.slice(0, eq).trim()] = value
  }
  await response.arrayBuffer()
  return response.status
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)]
}

const run = Date.now().toString(36)
const email = `latency-${run}@example.com`
const password = `Latency-P4ss-${run}`

await send('GET', '/api/v1/auth/me')
if ((await send('POST', '/api/v1/auth/signup', { email, displayName: 'Latency', password })) !== 201) {
  throw new Error('sign-up failed')
}
for (let i = 0; i < 10; i++) {
  if ((await send('POST', '/api/v1/auth/login', { email, password })) !== 200) throw new Error('warm-up log-in failed')
}
const timings = []
for (let i = 0; i < 50; i++) {
  const t0 = process.hrtime.bigint()
  const status = await send('POST', '/api/v1/auth/login', { email, password })
  timings.push(Number(process.hrtime.bigint() - t0) / 1e6)
  if (status !== 200) throw new Error(`log-in ${i} answered ${status}`)
}
const p50 = percentile(timings, 50)
const p95 = percentile(timings, 95)
const ok = p50 <= 400 && p95 <= 600
console.log(`NFR-MEASURE NFR1.6 running app, 50 sequential log-ins: p50=${p50.toFixed(1)} ms p95=${p95.toFixed(1)} ms min=${Math.min(...timings).toFixed(1)} ms max=${Math.max(...timings).toFixed(1)} ms (target p50<=400, p95<=600) ${ok ? 'MET' : 'NOT MET'}`)
process.exit(ok ? 0 : 1)
