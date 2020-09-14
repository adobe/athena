const Mocha = require('mocha');

const {
    EVENT_RUN_BEGIN,
    EVENT_RUN_END,
    EVENT_TEST_FAIL,
    EVENT_TEST_PASS,
    EVENT_SUITE_BEGIN,
    EVENT_SUITE_END
} = Mocha.Runner.constants;

class AthenaClusterReporter {
    constructor(runner) {
        this._indents = 0;
        const stats = runner.stats;
        const total = runner.total;

        runner.once(EVENT_RUN_BEGIN, function () {
            writeEvent(['start', {
                total: total
            }]);
        });

        runner.on(EVENT_TEST_PASS, function (test) {
            writeEvent(['pass', clean(test)]);
        });

        runner.on(EVENT_TEST_FAIL, function (test, err) {
            test = clean(test);
            test.err = err.message;
            test.stack = err.stack || null;
            writeEvent(['fail', test]);
        });

        runner.once(EVENT_RUN_END, function () {
            writeEvent(['end', stats]);
        });
    }
}

function writeEvent(event) {
    process.stdout.write(JSON.stringify(event) + '\n');
}

function clean(test) {
    return {
        title: test.title,
        fullTitle: test.fullTitle(),
        duration: test.duration,
        currentRetry: test.currentRetry()
    };
}

module.exports = AthenaClusterReporter;