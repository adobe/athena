const pm2 = require("pm2"),
    {find} = require("lodash");

function callClusterCommand(command) {
    (async function () {
        pm2.connect(function () {
            pm2.sendDataToProcessId({
                type: 'RUN_PERF',
                data: {
                    some: 'data'
                },
                id: 0,
                topic: 'topic'
            }, function (err, res) {
                process.exit(0);
            });
        });

        console.log("sent packet!!!");
    })();
}

module.exports = {
    callClusterCommand,
};