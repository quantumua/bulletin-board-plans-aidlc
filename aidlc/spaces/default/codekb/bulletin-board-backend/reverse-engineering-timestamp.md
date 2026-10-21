# Reverse Engineering Timestamp

## Run Record

- Date: 2026-10-20
- Commit: b75b6593bd48a9bb8b1c46f7aa4ac07a89832747
- Repo: bulletin-board-backend
- Breadth: full scan of the whole repository (first scan, no prior store)
- Depth: Standard
- Working tree: clean at scan time; no build output present

## Scope of Analysis

```yaml
scope_version: 1
kind: full
intent: 261020-user-login
fingerprint: d5e311c40cfa2ee6defe5efe6a6bddb1a349cfc3
analyzed:
  paths:
    - ./
  components:
    - BulletinBoardBackendApplication
    - AdController
    - AdService
    - AdRepository
    - Ad
    - AdRequest
    - AdResponse
    - AdNotFoundException
    - CorsConfig
    - application.properties
    - BulletinBoardBackendApplicationTests
    - AdControllerTests
shallow:
  paths:
    - mvnw
    - mvnw.cmd
```
