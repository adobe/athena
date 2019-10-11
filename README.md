# Athena

A Testing Engine for APIs

## Table of contents

* [Performance engine](#performance-engine)
  * [Deployment model](#deployment-model)
    * [1. Sidecar for k8s architecture](#1-sidecar-for-k8s)
    * [2. Sidecar for docker images](#2-sidecar-for-docker-images)
    * [3. Standalone cluster](#3-standalone-cluster)
  * [CI/CD model](#cicd-model)
    * [1. Git hooks](#1-git-hooks)
    * [2. REST Control Plane](#2-sidecar-for-docker-images)
    * [3. UI based](#3-ui-configuration-in-progress)
  * [Capabilities](#capabilities)
    * [1. White-box performance testing](#1-white-box-performance-testing---only-in-sidecar-deployment-model)
    * [2. Black-box performance testing](#2-black-box-performance-testing---in-both-sidecar-and-standalone-cluster-deployment-model)
  * [Support](#support)


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

## Performance Engine

### Deployment model

#### 1. Sidecar for k8s

Injected as a separate pod inside a node via k8s hooks and k8s controller, modifies iptables
so all inbound and outbound traffic goes through the athena sidecar, for checks and 
traffic proxying athena uses an envoy proxy that it configures for outbound traffic 
proxyig.

#### 2. Sidecar for docker images

Via a docker compose configuration - and bash scripting athena acts as a sidecar for 
individual docker images, the approach is the same like for k8s cluster.

#### 3. Standalone cluster

Individual athena nodes that generate requests to diferrent endpoints in different patterns
and scenarios

### CI/CD model

#### 1. Git hooks

Athena can be configured to listen to git hooks and run tests in any folder that contain 
a file called .perf.athena

#### 2. REST API

Athena has a simple control plane rest server that can be used to store patterns scenarios 
and tests and also can be used to start stop different tests and collect data about a specific
test

#### 3. UI configuration (in progress)

Athena has also an ui in which a user can configure tests patterns and scenario and Can
watch ongoing tests and see reports.


### Capabilities

#### 1. White box performance testing - only in sidecar deployment model

  1. redundancy check
  2. fault tolerance check
  3. network latency checks
  4. fault injection capabilities
  5. validate response data
  6. prerequisite request preparation

#### 2. Black box performance testing - in both sidecar and standalone cluster deployment model

  1. validate calls
  2. prerequisite request preparation
  
### Support

The configuration is yaml based and the code supported is javascript. The framework is based on **wrk engine** that can produce **>150000rps on one single machine**.

Athena performance engine supports:

1. patterns
2. spikes
3. ramp ups
4. cool downs
5. pipelining
6. hooks
    1. onInit
    2. onRequest
    3. onResponse
    4. onDestroy
7. mockup responses
8. fault injection





