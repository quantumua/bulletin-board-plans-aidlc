# Observability Requirements: u1-backend-auth

The backend has no metrics or monitoring stack today (codekb). This version adds structured security event logging (Q3) through the existing application log. Metrics, dashboards and alerting are out of scope until the board runs outside trusted environments.

| ID | Requirement | Pass / fail check |
|---|---|---|
| NFR2.4 | Security events are logged at INFO on a dedicated `security` logger, one line per event, as `event=<name> accountId=<id or none> outcome=<ok or reason> path=<path>`. Events: `signup`, `login_success`, `login_failure`, `account_locked`, `logout`, `write_refused` (anonymous, csrf, not_owner, unowned). | Each event appears once in the test logs for its scenario. |
| NFR2.5 | Security log lines never contain the email, password, session id or XSRF token. A failed log-in for an unknown email is logged with `accountId=none` (Q3, NFR2). | A grep of the test logs for the marker email, password, cookie and token finds nothing. |
| NFR7.4 | Unexpected errors are logged at ERROR with the exception and request path, without request bodies. | Forced-failure test shows an ERROR line with no body content. |
| NFR2.6 | Health indicator: when the backend is up, the existing `GET /api/v1/ads` answers 200. No new health endpoint is added in this version. | Smoke check in Build and Test. |

## Assumptions & Open Questions

None.
