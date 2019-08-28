# Atena

A Testing Engine for APIs

## POC requirements

- [x] a suite can have multiple tests
- [x] a test can be part of multiple suites
- [x] a test can run without being part of a suite
- [x] ability to run specific test/suite
- [x] flag for fail fast 
- [x] flag for log level - for easy debugging

**High Priority:**
* [⏳ In Progress] plugin management - define and load plugins in different contexts

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
  -h, --help                output usage information

```

