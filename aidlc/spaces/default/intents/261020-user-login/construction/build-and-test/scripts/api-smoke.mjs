// Cross-unit API smoke for contract C1 (/api/v1) and C2 (legacy /api/ads) against a running backend.
// Build and Test, intent 261020-user-login. Node 20+ (global fetch), no dependencies.
//
//   node api-smoke.mjs [baseUrl] [--phase main|restart-save|restart-check] [--state <file>]
//
// main           the full C1/C2 walk (default)
// restart-save   logs a user in and saves the session + token to --state (run BEFORE a backend restart)
// restart-check  replays the saved cookies AFTER a backend restart (NFR3.10: anonymous, never 500)
//
// Exit code 0 only when every check passed. Every check prints one line: PASS|FAIL <id> <text>.

import { readFileSync, writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const base = (args.find((a) => a.startsWith('http')) ?? 'http://localhost:8080').replace(/\/$/, '')
const phase = valueOf('--phase') ?? 'main'
const stateFile = valueOf('--state')

function valueOf(flag) {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : undefined
}

let passed = 0
let failed = 0

function check(id, ok, text, extra = '') {
  if (ok) passed += 1
  else failed += 1
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${text}${extra ? ` -- ${extra}` : ''}`)
  return ok
}

// A browser: keeps JSESSIONID and XSRF-TOKEN like the real frontend does (same origin).
class Browser {
  constructor(name, cookies = {}) {
    this.name = name
    this.cookies = { ...cookies }
  }

  get session() {
    return this.cookies.JSESSIONID
  }

  get xsrf() {
    return this.cookies['XSRF-TOKEN']
  }

  async request(method, path, { body, token = true, headers = {} } = {}) {
    const h = { Accept: 'application/json', ...headers }
    const cookie = Object.entries(this.cookies)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ')
    if (cookie) h.Cookie = cookie
    if (body !== undefined) h['Content-Type'] = 'application/json'
    if (token && !['GET', 'HEAD'].includes(method) && this.xsrf) h['X-XSRF-TOKEN'] = this.xsrf
    const response = await fetch(base + path, {
      method,
      headers: h,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'manual',
    })
    const setCookies = response.headers.getSetCookie()
    for (const sc of setCookies) {
      const [pair] = sc.split(';')
      const eq = pair.indexOf('=')
      const name = pair.slice(0, eq).trim()
      const value = pair.slice(eq + 1).trim()
      if (name === 'JSESSIONID' || name === 'XSRF-TOKEN') this.cookies[name] = value === '' ? undefined : value
    }
    const text = await response.text()
    let json
    try {
      json = text ? JSON.parse(text) : undefined
    } catch {
      json = undefined
    }
    return { status: response.status, headers: response.headers, setCookies, text, json }
  }

  me() {
    return this.request('GET', '/api/v1/auth/me')
  }

  signup(email, displayName, password) {
    return this.request('POST', '/api/v1/auth/signup', { body: { email, displayName, password } })
  }

  login(email, password) {
    return this.request('POST', '/api/v1/auth/login', { body: { email, password } })
  }

  logout() {
    return this.request('POST', '/api/v1/auth/logout')
  }
}

function isProblem(r, status, code) {
  const type = r.headers.get('content-type') ?? ''
  return r.status === status && type.includes('application/problem+json') && r.json?.code === code
}

const run = Date.now().toString(36)
const email = (who) => `${who}-${run}@example.com`
const password = (who) => `Smoke-${who}-P4ss-${run}`

async function main() {
  // NFR2.6 health: the existing list answers 200 when the backend is up
  const health = await new Browser('probe').request('GET', '/api/v1/ads')
  check('NFR2.6', health.status === 200 && Array.isArray(health.json), 'GET /api/v1/ads answers 200 with a JSON array')

  // --- me issues the anti-forgery cookie (C1 /auth/me, NFR3.5, NFR3.13)
  const ann = new Browser('ann')
  const me0 = await ann.me()
  check('C1.me', me0.status === 200 && me0.json?.user === null, 'visitor /auth/me answers {user:null}')
  check('NFR3.5', Boolean(ann.xsrf), 'GET /auth/me issues the XSRF-TOKEN cookie')
  const xsrfCookie = me0.setCookies.find((c) => c.startsWith('XSRF-TOKEN='))
  check('NFR3.4', xsrfCookie !== undefined && !/HttpOnly/i.test(xsrfCookie), 'XSRF-TOKEN is script-readable (not HttpOnly)', xsrfCookie)

  // --- sign-up (FR1, AC1.1, NFR3.1, NFR3.5)
  const tokenBefore = ann.xsrf
  const s1 = await ann.signup(`  ${email('ann').toUpperCase()} `, ' Ann ', password('ann'))
  check('AC1.1', s1.status === 201 && s1.json?.email === email('ann') && s1.json?.displayName === 'Ann', 'sign-up answers 201 with normalised email and trimmed name')
  check('NFR1.2', !s1.text.includes(password('ann')) && !s1.text.includes('$2'), 'sign-up response has no password or hash')
  const sessionCookie = s1.setCookies.find((c) => c.startsWith('JSESSIONID='))
  check(
    'NFR3.1',
    sessionCookie !== undefined && /HttpOnly/i.test(sessionCookie) && /SameSite=Lax/i.test(sessionCookie) && /Path=\//.test(sessionCookie) && !/Max-Age|Expires/i.test(sessionCookie),
    'session cookie HttpOnly, SameSite=Lax, Path=/, no expiry',
    sessionCookie,
  )
  check('NFR3.5', ann.xsrf && ann.xsrf !== tokenBefore, 'XSRF token rotated after sign-up')
  const annMe = await ann.me()
  check('FR1.6', annMe.json?.user?.displayName === 'Ann', 'logged in straight after sign-up')

  // --- duplicate, validation (AC1.2, AC1.3, AC1.4)
  const other = new Browser('other')
  await other.me()
  const d = await other.signup(`ANN-${run}@Example.com `, 'Other', password('other'))
  check('AC1.2', isProblem(d, 409, 'email_taken') && d.json?.detail === 'Email already registered', 'duplicate email (case/space) answers 409 email_taken')
  const v = await other.signup('not-an-email', '   ', 'short7!')
  const fields = (v.json?.errors ?? []).map((e) => e.field).sort().join(',')
  check('AC1.3/AC1.4', isProblem(v, 400, 'validation_failed') && fields === 'displayName,email,password', 'invalid sign-up answers 400 with field errors', fields)

  // --- second user, log-out, log-in (FR2.1, FR3.1, NFR3.2)
  const bob = new Browser('bob')
  await bob.me()
  const sb = await bob.signup(email('bob'), 'Bob', password('bob'))
  check('FR1.1', sb.status === 201, 'second account Bob created')
  const bobId = sb.json?.id
  const bobFirstSession = bob.session
  const lo = await bob.logout()
  check('FR3.1', lo.status === 204, 'log-out answers 204')
  const li = await bob.login(email('bob'), password('bob'))
  check('AC2.1', li.status === 200 && li.json?.displayName === 'Bob', 'log-in answers 200 with the display name')
  check('NFR3.2', bob.session && bob.session !== bobFirstSession, 'log-in issues a new session id')

  // --- wrong credentials (AC2.2, AC2.3, FR2.2)
  const probe = new Browser('probe2')
  await probe.me()
  const wrong = await probe.login(email('bob'), 'wrong-password')
  const unknown = await probe.login(`nobody-${run}@example.com`, 'wrong-password')
  check('AC2.2', isProblem(wrong, 401, 'bad_credentials') && wrong.json?.detail === 'Email or password is incorrect', 'wrong password answers 401 bad_credentials')
  check('AC2.3', isProblem(unknown, 401, 'bad_credentials') && unknown.json?.detail === wrong.json?.detail, 'unknown email gets the same message')

  // --- create, ownership (AC4.3, AC4.7, FR5.1, FR5.2)
  const c = await ann.request('POST', '/api/v1/ads', { body: { title: 'Bike for sale', description: 'Almost new', ownerId: bobId, owner: bobId } })
  const adId = c.json?.id
  check('AC4.3', c.status === 201 && c.json?.authorName === 'Ann' && c.json?.ownedByMe === true, 'logged-in create answers 201 owned by Ann')
  check('AC4.7', c.json?.authorName === 'Ann', 'owner fields in the body are ignored (owner stays Ann)')
  check('C1.create', (c.headers.get('location') ?? '').endsWith(`/api/v1/ads/${adId}`), 'Location header points to /api/v1/ads/{id}', c.headers.get('location'))

  const anonList = await new Browser('visitor').request('GET', '/api/v1/ads')
  const listed = (anonList.json ?? []).find((a) => a.id === adId)
  check('AC4.1/FR4.1', anonList.status === 200 && listed !== undefined && listed.ownedByMe === false, 'visitor can list ads; ownedByMe false')
  check('AC5.1', listed?.authorName === 'Ann', 'list shows the poster display name')
  check('AC5.2/NFR2.1', !anonList.text.includes('@'), 'list response contains no email address')
  const view = await new Browser('visitor').request('GET', `/api/v1/ads/${adId}`)
  check('FR4.1', view.status === 200 && view.json?.authorName === 'Ann' && !view.text.includes('@'), 'visitor can view one ad, no email')

  // --- second user cannot edit (AC4.4)
  const bobEdit = await bob.request('PUT', `/api/v1/ads/${adId}`, { body: { title: 'Hacked', description: 'by Bob' } })
  check('AC4.4', isProblem(bobEdit, 403, 'not_owner') && bobEdit.json?.detail === 'You can only edit your own ads', 'other user edit answers 403 not_owner')
  const afterBob = await new Browser('visitor').request('GET', `/api/v1/ads/${adId}`)
  check('AC4.4', afterBob.json?.title === 'Bike for sale', 'ad unchanged after refused edit')

  // --- owner edits (AC4.5)
  const annEdit = await ann.request('PUT', `/api/v1/ads/${adId}`, { body: { title: 'Red bike', description: 'Freshly painted', ownerId: bobId } })
  check('AC4.5', annEdit.status === 200 && annEdit.json?.title === 'Red bike' && annEdit.json?.authorName === 'Ann', 'owner edit answers 200 and keeps the owner')

  // --- anonymous writes refused (AC4.2, AC4.6, NFR5.4)
  const anon = new Browser('anon')
  await anon.me()
  const ac = await anon.request('POST', '/api/v1/ads', { body: { title: 'Spam', description: 'Spam' } })
  check('AC4.2', isProblem(ac, 401, 'not_authenticated'), 'anonymous create with token answers 401 not_authenticated')
  const acNoToken = await anon.request('POST', '/api/v1/ads', { body: { title: 'Spam', description: 'Spam' }, token: false })
  check('NFR5.4', isProblem(acNoToken, 403, 'csrf_invalid'), 'anonymous create without token answers 403 csrf_invalid first')
  const ae = await anon.request('PUT', `/api/v1/ads/${adId}`, { body: { title: 'Spam', description: 'Spam' } })
  check('AC4.6', isProblem(ae, 401, 'not_authenticated'), 'anonymous edit answers 401 not_authenticated')
  const forged = await ann.request('PUT', `/api/v1/ads/${adId}`, { body: { title: 'Forged', description: 'cross-site' }, token: false })
  check('NFR3', isProblem(forged, 403, 'csrf_invalid'), 'forged write with session but no token answers 403 csrf_invalid')
  const stillRed = await new Browser('visitor').request('GET', `/api/v1/ads/${adId}`)
  check('AC4.2/AC4.6', stillRed.json?.title === 'Red bike', 'ad unchanged after refused anonymous and forged writes')
  const spam = ((await new Browser('visitor').request('GET', '/api/v1/ads')).json ?? []).filter((a) => a.title === 'Spam')
  check('AC4.2', spam.length === 0, 'no ad created by refused anonymous writes')

  // --- legacy /api/ads parity (C2, NFR5.3)
  const legacyList = await new Browser('visitor').request('GET', '/api/ads')
  const legacyAd = (legacyList.json ?? []).find((a) => a.id === adId)
  check('C2.list', legacyList.status === 200 && legacyAd !== undefined && !('authorName' in legacyAd) && !('ownedByMe' in legacyAd), 'legacy list answers the old shape')
  check('C2.deprecation', legacyList.headers.get('deprecation') !== null && (legacyList.headers.get('link') ?? '').includes('/api/v1/ads'), 'legacy responses carry Deprecation and successor Link', `${legacyList.headers.get('deprecation')} | ${legacyList.headers.get('link')}`)
  const lAnon = await anon.request('POST', '/api/ads', { body: { title: 'Spam', description: 'Spam' } })
  check('NFR5.3', isProblem(lAnon, 401, 'not_authenticated'), 'legacy anonymous create answers 401')
  const lBob = await bob.request('PUT', `/api/ads/${adId}`, { body: { title: 'Hacked', description: 'legacy' } })
  check('NFR5.3', isProblem(lBob, 403, 'not_owner'), 'legacy edit by another user answers 403 not_owner')
  const lAnn = await ann.request('PUT', `/api/ads/${adId}`, { body: { title: 'Blue bike', description: 'Legacy edit' } })
  check('NFR5.3', lAnn.status === 200 && lAnn.json?.title === 'Blue bike' && !('authorName' in (lAnn.json ?? {})), 'legacy owner edit answers 200 in the old shape')
  const lCreate = await ann.request('POST', '/api/ads', { body: { title: 'Lamp', description: 'Legacy create' } })
  check('C2.create', lCreate.status === 201 && /\/api\/ads\/\d+$/.test(lCreate.headers.get('location') ?? ''), 'legacy create answers 201 with Location /api/ads/{id}', lCreate.headers.get('location'))

  // --- log-out, old session anonymous (AC3.1, AC3.2, NFR3.3)
  const oldSession = ann.session
  const oldToken = ann.xsrf
  const annOut = await ann.logout()
  check('AC3.1', annOut.status === 204, 'log-out answers 204')
  check('NFR3.5', ann.xsrf && ann.xsrf !== oldToken, 'XSRF token rotated after log-out')
  const replay = new Browser('replay', { JSESSIONID: oldSession, 'XSRF-TOKEN': ann.xsrf })
  const replayMe = await replay.me()
  check('AC3.2', replayMe.status === 200 && replayMe.json?.user === null, 'old session is anonymous on /auth/me')
  const replayWrite = await replay.request('PUT', `/api/v1/ads/${adId}`, { body: { title: 'Replay', description: 'old session' } })
  check('AC3.2/NFR3.3', isProblem(replayWrite, 401, 'not_authenticated'), 'write with the old session answers 401')

  // --- default deny for unknown paths (documented open item)
  const unknownPath = await new Browser('visitor').request('GET', '/does-not-exist')
  check('NFR5.1', [401, 403].includes(unknownPath.status) && typeof unknownPath.json?.code === 'string', 'unknown non-API path is refused (default deny) with a code', `${unknownPath.status} ${unknownPath.json?.code}`)
  const del = await bob.request('DELETE', `/api/v1/ads/${adId}`)
  check('NFR5.1', isProblem(del, 403, 'forbidden'), 'DELETE on an ad is refused 403 forbidden (no delete feature)')

  // --- lockout (AC2.4, FR2.3)
  const cleo = new Browser('cleo')
  await cleo.me()
  await cleo.signup(email('cleo'), 'Cleo', password('cleo'))
  await cleo.logout()
  const statuses = []
  for (let i = 0; i < 5; i++) statuses.push((await cleo.login(email('cleo'), 'wrong-password')).status)
  const locked = await cleo.login(email('cleo'), password('cleo'))
  check('AC2.4', statuses.every((s) => s === 401) && isProblem(locked, 423, 'account_locked'), '5 failures then the right password answers 423 account_locked', statuses.join(','))

  // --- NFR7 every refusal above was problem+json with a code (spot check on the 409/400/401/403/423 set)
  check('NFR7', [d, v, wrong, bobEdit, ac, acNoToken, locked].every((r) => (r.headers.get('content-type') ?? '').includes('application/problem+json') && typeof r.json?.code === 'string'), 'refusals are problem+json with a code')
}

async function restartSave() {
  const dan = new Browser('dan')
  await dan.me()
  const s = await dan.signup(email('dan'), 'Dan', password('dan'))
  check('NFR3.10.setup', s.status === 201 && Boolean(dan.session), 'Dan signed up and holds a session before the restart')
  writeFileSync(stateFile, JSON.stringify(dan.cookies))
}

async function restartCheck() {
  const cookies = JSON.parse(readFileSync(stateFile, 'utf8'))
  const stale = new Browser('stale', cookies)
  const me = await stale.me()
  check('NFR3.10', me.status === 200 && me.json?.user === null, 'after a restart the old session cookie is anonymous on /auth/me (not 500)', `${me.status}`)
  const write = await stale.request('POST', '/api/v1/ads', { body: { title: 'After restart', description: 'stale cookie' } })
  check('NFR3.10', write.status === 401 || write.status === 403, 'after a restart a write with the old cookie answers 401/403, never 500', `${write.status} ${write.json?.code}`)
  const fresh = new Browser('stale2', { JSESSIONID: cookies.JSESSIONID })
  await fresh.me()
  const write2 = await fresh.request('POST', '/api/v1/ads', { body: { title: 'After restart', description: 'stale cookie' } })
  check('NFR3.10', isProblem(write2, 401, 'not_authenticated'), 'with a fresh token the old session answers 401 not_authenticated')
}

const phases = { main, 'restart-save': restartSave, 'restart-check': restartCheck }
try {
  await phases[phase]()
} catch (error) {
  check('SMOKE', false, 'unexpected error', String(error))
}
console.log(`SUMMARY phase=${phase} base=${base} passed=${passed} failed=${failed}`)
process.exit(failed === 0 ? 0 : 1)
