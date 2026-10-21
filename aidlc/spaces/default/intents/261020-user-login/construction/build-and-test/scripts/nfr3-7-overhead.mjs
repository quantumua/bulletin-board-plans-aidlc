// NFR3.7: overhead of the session and anti-forgery checks on non-login requests.
// Target: <= 10 ms added at p95 compared with the same request before this change.
//
//   node nfr3-7-overhead.mjs <newBaseUrl> <baselineBaseUrl> [samples]
//
// newBaseUrl       the changed backend (security on), e.g. http://localhost:8080
// baselineBaseUrl  the pre-change backend built from the repository HEAD (git archive), e.g. http://localhost:8081
//
// Both servers get one ad first: on the baseline anonymously (the old open API), on the new backend
// through a logged-in user. Requests are interleaved after a warm-up so machine drift hits both series
// equally. Prints one NFR-MEASURE line and exits 1 when the target is missed.

const [newBase = 'http://localhost:8080', oldBase = 'http://localhost:8081', samplesArg = '300'] = process.argv.slice(2)
const samples = Number(samplesArg)
const WARM_UP = 50

function cookieJar() {
  const jar = {}
  return {
    jar,
    header: () => Object.entries(jar).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join('; '),
    store(response) {
      for (const sc of response.headers.getSetCookie()) {
        const [pair] = sc.split(';')
        const eq = pair.indexOf('=')
        jar[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim()
      }
    },
  }
}

async function json(response) {
  const text = await response.text()
  return text ? JSON.parse(text) : undefined
}

async function seedBaseline() {
  const r = await fetch(`${oldBase}/api/ads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Bike', description: 'Almost new' }),
  })
  if (r.status !== 201) throw new Error(`baseline create answered ${r.status}`)
  return (await json(r)).id
}

async function seedNew() {
  const c = cookieJar()
  const send = async (method, path, body) => {
    const headers = { Cookie: c.header() }
    if (body) headers['Content-Type'] = 'application/json'
    if (method !== 'GET') headers['X-XSRF-TOKEN'] = c.jar['XSRF-TOKEN']
    const r = await fetch(newBase + path, { method, headers, body: body && JSON.stringify(body) })
    c.store(r)
    return r
  }
  await send('GET', '/api/v1/auth/me')
  const run = Date.now().toString(36)
  const s = await send('POST', '/api/v1/auth/signup', { email: `perf-${run}@example.com`, displayName: 'Perf', password: `Perf-P4ss-${run}` })
  if (s.status !== 201) throw new Error(`signup answered ${s.status}`)
  const a = await send('POST', '/api/v1/ads', { title: 'Bike', description: 'Almost new' })
  if (a.status !== 201) throw new Error(`create answered ${a.status}`)
  return { id: (await json(a)).id, cookie: c.header() }
}

async function time(url, cookie) {
  const t0 = process.hrtime.bigint()
  const r = await fetch(url, { headers: cookie ? { Cookie: cookie } : {} })
  await r.arrayBuffer()
  const ms = Number(process.hrtime.bigint() - t0) / 1e6
  if (r.status !== 200) throw new Error(`${url} answered ${r.status}`)
  return ms
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)]
}

const baselineId = await seedBaseline()
const { id: newId, cookie } = await seedNew()

const series = {
  'baseline GET /api/ads/{id} (pre-change)': { url: `${oldBase}/api/ads/${baselineId}` },
  'new GET /api/v1/ads/{id} (visitor)': { url: `${newBase}/api/v1/ads/${newId}` },
  'new GET /api/v1/ads/{id} (logged in)': { url: `${newBase}/api/v1/ads/${newId}`, cookie },
  'new GET /api/ads/{id} (legacy, visitor)': { url: `${newBase}/api/ads/${newId}` },
}
for (const s of Object.values(series)) s.timings = []

for (let i = 0; i < WARM_UP; i++) for (const s of Object.values(series)) await time(s.url, s.cookie)
for (let i = 0; i < samples; i++) for (const s of Object.values(series)) s.timings.push(await time(s.url, s.cookie))

const base = percentile(series['baseline GET /api/ads/{id} (pre-change)'].timings, 95)
let worst = 0
for (const [name, s] of Object.entries(series)) {
  const p50 = percentile(s.timings, 50)
  const p95 = percentile(s.timings, 95)
  const added = p95 - base
  if (!name.startsWith('baseline')) worst = Math.max(worst, added)
  console.log(`  ${name}: p50=${p50.toFixed(2)} ms p95=${p95.toFixed(2)} ms${name.startsWith('baseline') ? '' : ` added p95=${added.toFixed(2)} ms`}`)
}
const ok = worst <= 10
console.log(`NFR-MEASURE NFR3.7 ${samples} interleaved samples per series: worst added p95=${worst.toFixed(2)} ms vs pre-change baseline p95=${base.toFixed(2)} ms (target <=10 ms) ${ok ? 'MET' : 'NOT MET'}`)
process.exit(ok ? 0 : 1)
