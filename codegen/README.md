# kalix-codegen

kalix-codegen is a JVM-based library that accepts protobuf descriptors and
introspects them to build a graph of Kalix event-sourced entities, along with their commands,
events and serializable state types. This graph can then be fed into code generation for which
multiple libraries are also provided e.g. `kalix-codegen-js` takes the graph along with a target source
directory and generates JavaScript Kalix source code. Any existing Kalix source code
is preserved.

## Contribution policy

Contributions via GitHub pull requests are gladly accepted from their original author. Along with
any pull requests, please state that the contribution is your original work and that you license
the work to the project under the project's open source license. Whether or not you state this
explicitly, by submitting any copyrighted material via pull request, email, or other means you
agree to license the material under the project's open source license and warrant that you have the
legal authority to do so.

## Testing

### Unit Tests

The majority of the test coverage is via the munit based unit tests in each SBT project. These should be
lightweight enough to be used regularly during development, and are configured in CI/CD to run on every commit.

### Integration Tests

Integration tests are provided but they must be manually invoked. This is because downstream
components may break as a result of changes made to codegen. Therefore, the integration tests
are provided as a tool to understand in advance what may break.

To be able to truly validate generated code, each language has a full integration test to generate and test the result in a dockerised environment.
These tests spin up a generated entity alongside the Kalix proxy in a Docker network, and then validate against the published service. These tests can take several minutes to run due to the overhead of installing dependencies in a containerised environment, so will only be run when necessary.

These tests are invoked with the `it:test` SBT task, either on the root project or within one of the subprojects that implements an integration test.
