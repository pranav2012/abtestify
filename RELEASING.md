# Releasing

Every push to `main` releases every port with one version number. `.github/workflows/release.yml` does it.

## How a release flows

1. **`release-and-publish`** builds, lints and tests the TypeScript package (the tests include the shared vectors). It then works out the version:
   - If `package.json` has a version newer than the latest GitHub release, that version is used. Use this for minor and major releases.
   - Otherwise it bumps the latest release's patch number (x.y.20 rolls over to x.(y+1).0, and x.9.20 to (x+1).0.0).

   It publishes to **npm**, then creates the GitHub release and its tag, for example `0.3.0`. That plain semver tag is also the **Swift Package Manager** release, since `Package.swift` is at the repository root.
2. Then these run in parallel, all with the same version:
   - **`tag-go`** tests the Go module and pushes the tag `go/v0.3.0`, which is how a Go module in the `go/` subdirectory is versioned. It then asks proxy.golang.org to fetch the release.
   - **`publish-crates`** writes the version into `rust/Cargo.toml`, runs the tests and runs `cargo publish`.
   - **`publish-pypi`** writes the version into `python/pyproject.toml`, runs the tests, builds the sdist and wheel, and uploads them with PyPI trusted publishing.
   - **`publish-maven`** runs the Java tests and publishes `io.github.pranav2012:abtestify:0.3.0`, signed, to Maven Central through the Central Portal. It releases the deployment automatically once the Portal has validated it, and the artifacts reach Maven Central 10 to 30 minutes later.

Until a registry's credentials are set up, its job does nothing except log a warning on the run's summary page, so npm releases keep working as before.

The versions in `rust/Cargo.toml` and `python/pyproject.toml`, and the Gradle default `0.0.0-SNAPSHOT`, are placeholders. The workflow sets the real version at release time and does not commit it back.

## One-time setup

Do these in any order. Each one switches on one registry.

### npm (already set up)

- [ ] The `NODE_AUTH_TOKEN` secret holds an npm automation token.

### crates.io

- [ ] Sign in to [crates.io](https://crates.io) with GitHub and verify your email address under Account Settings (publishing requires it).
- [ ] Under Account Settings > API Tokens, create a token with the `publish-new` and `publish-update` scopes. After the first release you can replace it with one limited to the `abtestify` crate.
- [ ] Add it to the repository as the secret **`CARGO_REGISTRY_TOKEN`** (Settings > Secrets and variables > Actions > New repository secret).

The name `abtestify` is free on crates.io as of this writing; the first release claims it.

### PyPI (trusted publishing, no token)

- [ ] Sign in to [PyPI](https://pypi.org) with two-factor authentication on.
- [ ] The project doesn't exist yet, so add a *pending* publisher: Account > Publishing > Add a new pending publisher > GitHub, with:
  - PyPI project name: `abtestify`
  - Owner: `pranav2012`
  - Repository name: `abtestify`
  - Workflow name: `release.yml`
  - Environment name: `pypi`
- [ ] In GitHub, Settings > Environments, create an environment named `pypi`. Optionally add yourself as a required reviewer to approve each PyPI upload.
- [ ] Settings > Secrets and variables > Actions > Variables: add the repository variable **`PYPI_ENABLED`** with the value `true`.

The name `abtestify` is free on PyPI as of this writing; the first upload claims it and turns the pending publisher into a normal one.

### Maven Central (Central Portal)

1. Account and namespace:
   - [ ] Create an account at [central.sonatype.com](https://central.sonatype.com). If you sign in with GitHub as `pranav2012`, the namespace `io.github.pranav2012` is created and verified for you.
   - [ ] If you sign up another way, add the namespace `io.github.pranav2012` under Namespaces. Then verify it by creating a public GitHub repository named after the verification key the Portal shows, and pressing Verify. You can delete that repository afterwards.
2. Publishing token:
   - [ ] On the Portal, open your account menu > View Account > Generate User Token. This is not your login password.
   - [ ] Add the token's username as the secret **`MAVEN_CENTRAL_USERNAME`** and its password as **`MAVEN_CENTRAL_PASSWORD`**.
3. Signing key (Maven Central requires signed artifacts):
   - [ ] Generate a key with a passphrase: `gpg --full-generate-key` (choose RSA, 4096 bits, and your name and `p2012agarwal@gmail.com`).
   - [ ] Find its ID with `gpg --list-secret-keys --keyid-format=long`.
   - [ ] Publish the public key so Central can check signatures: `gpg --keyserver keyserver.ubuntu.com --send-keys <KEY_ID>` (optionally also `keys.openpgp.org`).
   - [ ] Export the private key, `gpg --export-secret-keys --armor <KEY_ID>`, and add the whole output, from `-----BEGIN PGP PRIVATE KEY BLOCK-----` to `-----END PGP PRIVATE KEY BLOCK-----`, as the secret **`SIGNING_KEY`**.
   - [ ] Add the passphrase as the secret **`SIGNING_PASSWORD`**.

The Maven job only runs once all four secrets are set.

### Go and Swift

Nothing to set up. Both are released by git tags, which the workflow creates with the built-in `GITHUB_TOKEN`. If you add a tag ruleset or protection, let GitHub Actions create `go/v*` tags and plain `x.y.z` tags. Optionally, submit the repository to the [Swift Package Index](https://swiftpackageindex.com/add-a-package) so Swift users can find it.

## When something fails

- **A registry job fails after npm published.** Fix the cause, for example a missing secret, then use **Re-run failed jobs** on the same workflow run. The re-run reuses the version the first job computed, and the jobs that succeeded don't run again.
- **A version can't be published twice.** npm, crates.io, PyPI and Maven Central all refuse to overwrite a version. If a release was half-published and needs a code change, merge the fix; the next push to `main` releases the next patch version everywhere.
- **Turning on a registry later.** The first release after you add its credentials publishes it at that release's version. Earlier versions are not backfilled.

## Things to know

- **Go major versions.** At 2.0.0 the Go module path must change to `github.com/pranav2012/abtestify/go/v2` (in `go/go.mod` and every import), or `go get` will refuse the `go/v2.x.y` tags. Do this in the same change that bumps `package.json` to 2.0.0.
- **Changing the algorithm.** Change the TypeScript first, regenerate the vectors with `yarn build && yarn vectors`, and update every port until its tests pass. CI fails if the committed vectors are stale or if any port disagrees with them.
- **Local checks before merging.**

  ```bash
  yarn build && yarn test && yarn vectors && git diff --exit-code test-vectors/vectors.json
  (cd go && go test ./...)
  (cd rust && cargo test)
  (cd python && python3 -m pip install -e . pytest && python3 -m pytest)
  (cd java && ./gradlew test)
  swift test
  ```
