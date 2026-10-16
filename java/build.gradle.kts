import com.vanniktech.maven.publish.JavaLibrary
import com.vanniktech.maven.publish.JavadocJar

plugins {
    `java-library`
    id("com.vanniktech.maven.publish") version "0.37.0"
}

group = "io.github.pranav2012"
// The release workflow passes -PreleaseVersion=<version>, the same version as npm.
version = providers.gradleProperty("releaseVersion").getOrElse("0.0.0-SNAPSHOT")

repositories {
    mavenCentral()
}

dependencies {
    testImplementation(platform("org.junit:junit-bom:6.1.3"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
    testImplementation("com.google.code.gson:gson:2.14.0")
}

// The library targets Java 8 bytecode so Android and older JVMs can use it;
// tests run on the build JDK.
tasks.named<JavaCompile>("compileJava") {
    options.release.set(8)
    options.compilerArgs.add("-Xlint:-options")
}

tasks.withType<JavaCompile>().configureEach {
    options.encoding = "UTF-8"
}

tasks.test {
    useJUnitPlatform()
}

mavenPublishing {
    configure(JavaLibrary(javadocJar = JavadocJar.Javadoc(), sourcesJar = true))
    coordinates("io.github.pranav2012", "abtestify", version.toString())
    publishToMavenCentral(automaticRelease = true)
    // Signing needs ORG_GRADLE_PROJECT_signingInMemoryKey; local builds skip it.
    if (providers.gradleProperty("signingInMemoryKey").isPresent) {
        signAllPublications()
    }

    pom {
        name.set("abtestify")
        description.set(
            "Deterministic A/B test bucketing with per-experiment hashing, exposure and split " +
                "control; identical assignments to the abtestify npm package. Works from Java and Kotlin.",
        )
        inceptionYear.set("2024")
        url.set("https://github.com/pranav2012/abtestify")
        licenses {
            license {
                name.set("MIT License")
                url.set("https://opensource.org/licenses/MIT")
                distribution.set("repo")
            }
        }
        developers {
            developer {
                id.set("pranav2012")
                name.set("Pranav Agarwal")
                email.set("p2012agarwal@gmail.com")
                url.set("https://github.com/pranav2012")
            }
        }
        scm {
            url.set("https://github.com/pranav2012/abtestify")
            connection.set("scm:git:git://github.com/pranav2012/abtestify.git")
            developerConnection.set("scm:git:ssh://git@github.com/pranav2012/abtestify.git")
        }
    }
}

tasks.withType<Javadoc>().configureEach {
    (options as StandardJavadocDocletOptions).addStringOption("Xdoclint:all,-missing", "-quiet")
}
