# Athena

A Testing Engine for APIs

## POC requirements

**TODO: In Progress**

- [x] a suite can have multiple tests
- [x] a test can be part of multiple suites
- [x] a test can run without being part of a suite
- [x] ability to run specific test/suite
- [x] flag for fail fast 
- [x] flag for log level - for easy debugging
- [x] refactor to entities
- [x] refactor settings parsing
- [x] adjust assertion parsing, make sure expressions are properly loaded
- [x] add plugins hooks ⚠️ (unstable)
- [x] add fixture support ⚠️ (unstable)
- [x] add model validation (joi)
- [ ] decouple chakram-specific properties from the testEntity to chakramTestEntity
- [ ] provide full (dynamic) plugins support
- [ ] provide full (dynamic) fixture support
- [ ] add unit tests for existing functionality

**High Priority:**
* [⏳ In Progress] plugin management
    * define plugins and adjust Athena's functionality on the fly
    * define fixtures and inject them in certain contexts
* model validation
* version management - dependency graph:
  * a suite can depend on an api version
  * a test can depend on an api version
  * a test can depend on a suite version
* when running tests specify api and api version
* engine selection: (since this is a unified platform)
  * autocannon or wrk for performance
  * chakram - for functional
* suites & tests need ability to read encrypted configuration
    * Using pem certificates
    * Provisioned from Vault
  
**Low Priority:**

* suites & tests need ability to read configuration from - configuration.yaml for each test
* ability to run suites & tests in parallel
* easy run plugins(utility functions) and assertions
* define performance test model
  * peek
  * ramp up
  * hooks
  * cool down
  * eventual assertions
  * connections
  * threads
  * duration
  * desired RPS
  * patterns
    * how many connections and how much rps goes to what scenario
    * patterns are like independent performance scenarios and can have peeks as well separate duration, separate number of threads.

## FUTURE

* cli to generate test yamls from open-api standard
* cli to generate test yamls from envoy configuration
* cli to generate test yamls from gateway json configuration

## Performance engine

* start from cmd
* start via rest interface
* real time feedback on how much it is left of the test
* reporting
* persistance
* grab scenarios from remote location s3 / blob / etc


## Documentation

### Getting Started

`node athena.js --tests-path custom_tests_path`

```
Usage: athena [options]

Options:
  -V, --version             output the version number
  -t, --tests-path <path>   Specify the tests path.
  -D, --debug               Enable debug logging.
  -p, --make-plugin <name>  Scaffold a new plugin.
  -t, --make-test           Scaffold a new test.
  -g, --grep <regex>        Run only specific tests.
  -b, --bail                Fail fast after the first test failure.
  -v, --version <number>    The suite or test version number to run.
  -P, --performance         run performance tests
  -F, --functional          run functional tests
  -h, --help                output usage information

```

By default, Athena will run only functional tests with the following command;

```
node athena.js
```

The `--functional` flag can be used when you would like to run both **functional** and **performance** tests as well:

```
node athena.js --performance --functional
```

## Config Properties

### Common

The following properties are common to all entity types (`suite`, `test`):

#### `type`
* **Context:** `suite`,`test`
* **Possible values:** `suite`,`test`

The entity type.

#### `engine`

* **Context:** `suite`,`test`
* **Possible values:** `chakram`, `autocannon`

Required for top level suites and independent tests only. The `engine` property will be ignored for entities that are assigned to certain suites.

## Plugins

Plugins allow you to extend Athena's functionality.

## Fixtures

Fixtures are helper functions that can be injected in various contexts.

### Configuration

Fixtures need to be defined and configured first via `yaml` files in order to be used inside tests. The following configuration options are available while defining fixtures:

#### `name`

*(Required)* The fixture name in `camelCase`, which will also act as the provisioned function name.

#### `type`

*(Required)* The module type (`fixture`).

#### `config:type`

*(Required)* The fixture type. Allowed values: `lib`, `inline`.

#### `config:source`

*(Required)* The fixture source path if `config:type` is set to `lib`. The fixture implementation if the `config:type` is set to `inline`.

The following is an example of a valid fixture definition:

```yaml
name: getUUID
type: fixture
config:
  type: lib
  source: fixtures/getUUIDFixture.js
```

### Dependencies

All fixture dependencies are automatically detected and installed during runtime. The following example represents a valid fixture without the need for you to manage the `package.json` file.

```javascript
const uuid = require("uuid/v1");

function uuidFixture() {
    return uuid();
}

module.exports = uuidFixture;
``` 

> 💡 **Note:** If a test is marked as unstable during the pre-flight check, its dependencies will not be installed. 