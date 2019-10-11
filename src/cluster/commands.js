// External
const pm2 = require("pm2");

const MESSAGE_TOPIC = "ATHENA_CLUSTER_COMMAND";

function makeMessage(command, data) {
    return {
        id: 0,
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

    pm2.sendDataToProcessId(
        makeMessage(messageType, {data}),
        _handleError
    );
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