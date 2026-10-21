## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-10-20T15:43:45Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261020-user-login/inception/requirements-analysis/requirements.md > FR2.2 vs FR2.3 / AC2.4 | FR2.2 says log-in errors must not reveal whether an email is registered. FR2.3 returns a distinct "temporarily locked" message, which only exists for real accounts. Anyone can find out whether an email is registered by failing 5 times and reading the message. That contradicts FR2.2, and A6 only accepts the leak at sign-up. | Either state in the assumptions that this leak is accepted (as A6 does for sign-up), or require the same generic message while locked. Also say what a failed attempt during a lock does: does it extend the lock? Is the count reset when the lock expires? | New |
| R-02 | Major | aidlc/spaces/default/intents/261020-user-login/inception/requirements-analysis/requirements.md > FR4.2 / FR4.3 / AC4.7 | The rule that the server sets the owner and never takes it from the request body is tested only for create (AC4.7). Nothing says an owner edit cannot change the owner (a PUT body with another owner). That is the one path where the ownership goal could be undone through the API. | Add a requirement and an acceptance criterion: when the owner edits an ad, any owner in the body is ignored and the ownership stays unchanged. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261020-user-login/inception/requirements-analysis/requirements.md > FR1.3 | Two sign-ups with the same email at the same moment are not covered. "Clear message" is not measurable. | Require that the email uniqueness rule holds under concurrent requests (exactly one account is created). Give the exact refusal text, as AC1.2 and AC2.2 do. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261020-user-login/inception/requirements-analysis/requirements.md > FR5.1 / NFR | Display names are user-supplied text shown to everyone, and no requirement says they are shown as plain text. Script in a name would be an injection risk. | Add a pass/fail criterion: a display name containing markup is shown as literal text and never run. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261020-user-login/inception/requirements-analysis/requirements.md > FR1.4–FR1.5, A1–A2 | The 8-character minimum comes from Q2. The 128-character maximum, the 50-character display name and the 254-character email limit are the team's own additions. They were not part of the confirmed summary the human approved, and FR1.4 and FR1.5 present them as firm requirements. AC1.3 checks the 7-character minimum, but nothing checks the maximums. | Say at the gate that these limits are proposals. Add boundary acceptance criteria (129-character password, 51-character name) or drop them. | New |
| R-06 | Minor | aidlc/spaces/default/intents/261020-user-login/inception/requirements-analysis/requirements.md > FR3.2 | "Until the browser is closed" depends on browser session restore, which can keep session cookies across restarts. The backend session has no stated expiry, so a session could live forever on a long-open browser. | State whether an idle or maximum session lifetime applies. Otherwise record "no server-side expiry" as an accepted assumption. | New |
| R-07 | Minor | aidlc/spaces/default/intents/261020-user-login/inception/requirements-analysis/requirements.md > FR2 / FR3 | Logging in while already logged in, or signing up while logged in, is not covered. | Pick a behavior, such as replace the session or refuse, or mark it as out of scope. | New |

### Summary

The requirements are well structured, testable and traceable to the intent and the confirmed answers. Engineering can start from them. Two gaps are worth weighing at the gate: the lockout message leaks which emails are registered, and the owner-cannot-change rule is untested on edit. The remaining findings are minor.
