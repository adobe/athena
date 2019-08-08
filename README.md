# Atena

A Testing Engine for APIs

## Getting Started

`node atena.js --tests-path custom_tests_path`

```
Usage: atena [options]

Options:
  -V, --version             output the version number
  -t, --tests-path <path>   Specify the tests path.
  -D, --debug               Enable debug logging.
  -p, --make-plugin <name>  Scaffold a new plugin
  -h, --help                output usage information
```

## POC requirements

* suites & tests need ability to read configuration from - configuration.yaml for each test
* suites & tests need ability to read encrypted configuration
* ability to run suites & tests in parallel
* flag for fail fast
* ability to run specific test / specific suite
* version management - dependecy graph:
  * a suite can depende on an api version
  * a test can depend on an api version
  * a test can depend on a suite version
* when running tests specify api and api version
* easy run plugins(utility functions) and assertions
