# Technology Stack: bulletin-board-backend

## Languages

| Language | Version | Where |
|---|---|---|
| Java | 25 (`java.version` in `pom.xml`) | all application and test code |
| Properties | — | `application.properties` |
| Shell / Batch | — | Maven Wrapper scripts `mvnw`, `mvnw.cmd` |

Runtime requirement (README): JDK 25 or newer, `JAVA_HOME` pointing to it.

## Frameworks

| Framework | Version | Purpose |
|---|---|---|
| Spring Boot | 4.1.1 (parent POM) | application framework, auto-configuration, embedded server |
| Spring MVC (`spring-boot-starter-webmvc`) | managed by Boot 4.1.1 | REST controllers, CORS, problem details |
| Spring Data JPA (`spring-boot-starter-data-jpa`) | managed | repositories over Hibernate ORM |
| Hibernate ORM | managed (via Data JPA starter) | JPA provider, schema generation (`create-drop`) |
| Jakarta Bean Validation (`spring-boot-starter-validation`) | managed | `@NotBlank`, `@Size`, `@Valid` |

## Data Store

| Technology | Version | Usage |
|---|---|---|
| H2 Database (`com.h2database:h2`, runtime scope) | managed | in-memory DB `jdbc:h2:mem:bulletinboard`; data lost on restart |
| H2 web console (`spring-boot-h2console`) | managed | `/h2-console`, enabled |

## Build and Tooling

| Tool | Version | Notes |
|---|---|---|
| Maven | 3.9.16 | via wrapper `distributionUrl` |
| Maven Wrapper | 3.3.4 | `distributionType=only-script` |
| `spring-boot-maven-plugin` | managed | `spring-boot:run`, executable jar packaging |

## Testing

| Library | Version | Purpose |
|---|---|---|
| `spring-boot-starter-webmvc-test` | managed | MockMvc and `@AutoConfigureMockMvc` (Boot 4 package `org.springframework.boot.webmvc.test.autoconfigure`) |
| `spring-boot-starter-data-jpa-test` | managed | JPA test slice support |
| `spring-boot-starter-validation-test` | managed | validation test support |
| JUnit Jupiter, Hamcrest, JsonPath, Spring Test | managed (transitive) | assertions and test runtime |

## Not in the Stack

Spring Security, OAuth2/JWT libraries, password hashing libraries, Flyway/Liquibase, Spring Boot Actuator, springdoc/OpenAPI, Lombok, MapStruct, Docker files, code-quality plugins (Checkstyle, SpotBugs, JaCoCo).

## Version Notes

Spring Boot 4.1.1 and Java 25 are current-generation releases. Boot 4 splits test auto-configuration into per-technology `*-test` starters (as seen in `pom.xml`), so adding a new technology (for example security) typically also means adding its matching test starter. Exact resolved versions of managed artifacts are defined by the Boot 4.1.1 BOM and were not resolved in this scan (no build was run).
