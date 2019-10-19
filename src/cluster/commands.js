// External
const pm2 = require("pm2"),
    nanoid = require("nanoid");

const MESSAGE_TOPIC = "ATHENA_CLUSTER_COMMAND";

function makeMessage(command, data) {
    return {
        id: nanoid(12),
        topic: MESSAGE_TOPIC,
        type: command,
        data
    };
};

const _sendManagerCommand = (messageType, data) => {
    const _handleError = (error) => {
        if (error) {
            throw error;
        }

        process.exit(0);
    };

    data = JSON.stringify(data);

    pm2.list(function (err, list) {
        pm2.sendDataToProcessId(
            list[0].pm2_env.pm_id,
            makeMessage(messageType, {data}),
            _handleError
        );
    });
};

function callClusterCommand(messageType, data) {
    pm2.connect(() => {
        _sendManagerCommand(messageType, data)
    });
}

module.exports = {
    callClusterCommand,
    makeMessage
};