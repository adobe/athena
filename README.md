# Athena

A Testing Engine for APIs

## Getting Started

`node atena.js --tests-path custom_tests_path`

```
Usage: atena [options]

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

By default, Atena will run only functional tests with the following command;

```
node atena.js
```

The `--functional` flag can be used when you would like to run both **functional** and **performance** tests as well:

```
node atena.js --performance --functional
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
