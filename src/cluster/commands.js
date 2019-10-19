/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

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