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
module.exports = function generatedPlugin(Atena) {
    Atena.addFilter("chakramParseScenarioGiven", function (given, test) { // demo with multiple args
        if (test.config.name === "ccecoTest") {
            return `
                const host = "https://facebook.com"
                console.log("🔥 Switched host to " + host + " from a plugin" )
             `;
        }

        return given;
    }, 10);

    Atena.addFilter("chakramParseScenarioThen", function (then) {
        return `${then}`;
    }, 10);
};