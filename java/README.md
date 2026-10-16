# abtestify for Java and Kotlin

Deterministic A/B test bucketing for the JVM and Android. Java 8 bytecode, no
dependencies. Assignments are byte-for-byte identical to the
[abtestify](https://github.com/pranav2012/abtestify) npm package and its Go,
Rust, Python and Swift ports.

Gradle (Kotlin DSL):

```kotlin
dependencies {
    implementation("io.github.pranav2012:abtestify:<version>")
}
```

Maven:

```xml
<dependency>
  <groupId>io.github.pranav2012</groupId>
  <artifactId>abtestify</artifactId>
  <version><!-- version --></version>
</dependency>
```

Java:

```java
import io.github.pranav2012.abtestify.ABTestify;
import io.github.pranav2012.abtestify.Assignment;
import io.github.pranav2012.abtestify.Params;

Assignment assignment = ABTestify.getBucket(
        Params.builder("checkout-cta", "user123")
                .treatmentSplit(50) // optional, default 50
                .exposure(100) // optional, default 100
                .build());
if (assignment.getResolvedVariant().equals("treatment")) {
    // show the new checkout button
}
```

Kotlin:

```kotlin
import io.github.pranav2012.abtestify.ABTestify
import io.github.pranav2012.abtestify.Params

val variant = ABTestify.getBucket(
    Params.builder("checkout-cta", "user123")
        .treatmentSplit(50.0)
        .exposure(100.0)
        .build(),
).resolvedVariant

// With every default:
val simple = ABTestify.getBucket("checkout-cta", "user123").resolvedVariant
```

Invalid input throws `InvalidParamsException`, an `IllegalArgumentException`
whose `getField()` names the parameter.
