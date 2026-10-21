// NFR3.1 (Secure part): over HTTPS the session cookie and the XSRF-TOKEN cookie carry `Secure`;
// HttpOnly / SameSite=Lax / Path=/ / no expiry still hold. Run against the backend started with a
// throwaway self-signed certificate (see performance-test-instructions.md / security-test-instructions.md):
//
//   NODE_TLS_REJECT_UNAUTHORIZED=0 node https-cookie-check.mjs https://localhost:8443
//
// Exit 0 only when every check passed.

const base = (process.argv[2] ?? 'https://localhost:8443').replace(/\/$/, '')
let failed = 0
function check(id, ok, text, extra = '') {
  if (!ok) failed += 1
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${text}${extra ? ` -- ${extra}` : ''}`)
}
const cookies = {}
function store(response) {
  for (const sc of response.headers.getSetCookie()) {
    const [pair] = sc.split(';')
    const eq = pair.indexOf('=')
    const value = pair.slice(eq + 1).trim()
    if (value) cookies[pair.slice(0, eq).trim()] = value
  }
  return response.headers.getSetCookie()
}

const me = await fetch(`${base}/api/v1/auth/me`)
const meCookies = store(me)
const xsrf = meCookies.find((c) => c.startsWith('XSRF-TOKEN='))
check('NFR3.1', xsrf !== undefined && /;\s*Secure/i.test(xsrf), 'XSRF-TOKEN carries Secure over HTTPS', xsrf)

const run = Date.now().toString(36)
const signup = await fetch(`${base}/api/v1/auth/signup`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-XSRF-TOKEN': cookies['XSRF-TOKEN'],
    Cookie: `XSRF-TOKEN=${cookies['XSRF-TOKEN']}`,
  },
  body: JSON.stringify({ email: `tls-${run}@example.com`, displayName: 'Tls', password: `Tls-P4ss-${run}` }),
})
const session = store(signup).find((c) => c.startsWith('JSESSIONID='))
check('NFR3.1', signup.status === 201, 'sign-up over HTTPS answers 201', String(signup.status))
check(
  'NFR3.1',
  session !== undefined && /;\s*Secure/i.test(session) && /HttpOnly/i.test(session) && /SameSite=Lax/i.test(session) && /Path=\//.test(session) && !/Max-Age|Expires/i.test(session),
  'session cookie over HTTPS: Secure, HttpOnly, SameSite=Lax, Path=/, no expiry',
  session,
)
const logout = await fetch(`${base}/api/v1/auth/logout`, {
  method: 'POST',
  headers: {
    'X-XSRF-TOKEN': cookies['XSRF-TOKEN'],
    Cookie: `XSRF-TOKEN=${cookies['XSRF-TOKEN']}; JSESSIONID=${cookies.JSESSIONID}`,
  },
})
const cleared = logout.headers.getSetCookie().find((c) => c.startsWith('JSESSIONID='))
// Tomcat renders Max-Age=0 as an Expires date in 1970; either form deletes the cookie
const expired = cleared !== undefined && (/Max-Age=0/i.test(cleared) || /Expires=[^;]*1970/i.test(cleared))
check('NFR3.3', logout.status === 204 && expired && /;\s*Secure/i.test(cleared), 'log-out over HTTPS clears the session cookie with Secure', cleared)
console.log(`SUMMARY https-cookie-check failed=${failed}`)
process.exit(failed === 0 ? 0 : 1)
