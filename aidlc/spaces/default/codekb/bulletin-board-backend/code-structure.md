# Code Structure: bulletin-board-backend

## Repository Layout

```
bulletin-board-backend/
├── .gitattributes                 line-ending rules for mvnw / *.cmd
├── .gitignore                     Spring Initializr default ignores (target/, IDE files)
├── .mvn/wrapper/maven-wrapper.properties
├── mvnw, mvnw.cmd                 Maven Wrapper launch scripts (generated)
├── pom.xml                        single-module Maven build
├── README.md                      run/test/API/configuration docs
└── src/
    ├── main/
    │   ├── java/com/example/bulletinboard/
    │   │   ├── BulletinBoardBackendApplication.java
    │   │   ├── ad/
    │   │   │   ├── Ad.java
    │   │   │   ├── AdController.java
    │   │   │   ├── AdNotFoundException.java
    │   │   │   ├── AdRepository.java
    │   │   │   ├── AdRequest.java
    │   │   │   ├── AdResponse.java
    │   │   │   └── AdService.java
    │   │   └── config/
    │   │       └── CorsConfig.java
    │   └── resources/
    │       └── application.properties
    └── test/java/com/example/bulletinboard/
        ├── BulletinBoardBackendApplicationTests.java
        └── ad/
            └── AdControllerTests.java
```

18 tracked files; 10 Java main sources, 2 Java test sources, 1 properties file.

## Package Organization

| Package | Organization style | Contents |
|---|---|---|
| `com.example.bulletinboard` | root | Boot entry point; component scanning starts here |
| `com.example.bulletinboard.ad` | by feature (vertical slice) | everything about ads: web, service, persistence, DTOs, error |
| `com.example.bulletinboard.config` | by technical concern | web/CORS configuration |

Visibility: `AdResponse.from(Ad)` is package-private, so mapping is only used inside `ad`. `Ad`'s no-arg constructor is `protected` (JPA only); `Ad.onCreate`/`onUpdate` are package-private lifecycle callbacks.

## File Classification

| File | Category |
|---|---|
| `BulletinBoardBackendApplication.java` | Configuration (bootstrap) |
| `ad/Ad.java` | Model/Entity |
| `ad/AdRequest.java` | Model (input DTO, validation constraints, length constants) |
| `ad/AdResponse.java` | Model (output DTO + mapper) |
| `ad/AdController.java` | Controller/Handler |
| `ad/AdService.java` | Service/UseCase |
| `ad/AdRepository.java` | Repository/DAO |
| `ad/AdNotFoundException.java` | Utility (error type) |
| `config/CorsConfig.java` | Configuration / Middleware (CORS) |
| `resources/application.properties` | Configuration |
| `test/.../BulletinBoardBackendApplicationTests.java` | Test (context smoke test) |
| `test/.../ad/AdControllerTests.java` | Test (MockMvc integration) |
| `pom.xml`, `.mvn/...`, `mvnw*` | Build configuration |

No migration files, static assets, or templates.

## Code Patterns

- **Constructor injection** everywhere (`AdController(AdService)`, `AdService(AdRepository)`, `CorsConfig(@Value String[])`); no field injection in main code.
- **Java records for DTOs** (`AdRequest`, `AdResponse`) with Bean Validation annotations on record components.
- **Static factory mapper** `AdResponse.from(Ad)`.
- **Shared constants for limits**: `AdRequest.TITLE_MAX_LENGTH` / `DESCRIPTION_MAX_LENGTH` are reused by `@Column(length = ...)` on `Ad`, keeping DB and API limits in sync.
- **Entity encapsulation**: `Ad` exposes getters and a single `update(title, description)` mutator; no setters.
- **Lifecycle timestamps** via `@PrePersist` / `@PreUpdate`.
- **Transaction boundary at the service**: class-level `@Transactional(readOnly = true)`, write methods override with `@Transactional`.
- **Errors as `ErrorResponseException`** subclasses carrying a `ProblemDetail`.
- **Spring Data derived query** `findAllByOrderByCreatedAtDesc`.
- **Style**: generated bootstrap/test classes use tabs, hand-written classes use 4 spaces; `var` used once in the controller.

## Where New Code Would Naturally Go

Following the existing convention, a new feature (for example user accounts) would be a sibling feature package next to `ad/` with its own entity, repository, service, controller and DTOs, and cross-cutting security configuration would sit in `config/`. This is an observation of the convention, not a design.
