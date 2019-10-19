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

// node
const fs = require("fs"),
    path = require("path");

// project
const {snakeToCamel, maybeCreateDirSync, makeLogger} = require("../utils");

class ScaffoldManager {
    constructor(options) {
        this.options = options;
        this.log = makeLogger();
    }

    handleScaffoldFailure = (...m) => {
        this.log.error(...m);
        process.exit(1);
    };

    /**
     * Dynamically called handlers.
     */

    handleMakePlugin = () => {
        const {pluginsDirPath, makePlugin} = this.options;

        // Normalize the plugin name.
        const pluginName = snakeToCamel(makePlugin)

        // Check whether the plugins directory exists, otherwise create it.
        maybeCreateDirSync(pluginsDirPath);

        // Check whether a plugin with the same name already exists.
        let pluginFiles;

        try {
            pluginFiles = fs.readdirSync(pluginsDirPath).filter(f => f.indexOf(".js") !== -1);
        } catch (e) {
            this.handleScaffoldFailure()
        }

        for (let pluginFile of pluginFiles) {
            if (pluginFile.indexOf(pluginName) !== -1) {
                this.handleScaffoldFailure(`A plugin named "${pluginName}" already exists!`);
            }
        }

        // Try to scaffold a new plugin.
        try {
            const finalPluginPath = path.resolve(pluginsDirPath, `${pluginName}.js`);
            let pluginTemplate = fs.readFileSync(path.resolve(__dirname, "templates", "plugin.js"), "utf-8"); // todo: Move this into config?
            pluginTemplate = pluginTemplate.replace("$PLUGIN_NAME", pluginName);
            fs.writeFileSync(finalPluginPath, pluginTemplate, 'utf-8');
        } catch (e) {
            this.handleScaffoldFailure(`Could not create plugin "${pluginName}" due to the following error: \n`, e);
        }

        // Log whether the plugin has been successfully created, or not.
        this.log.success(`The "${pluginName}" plugin has been successfully created inside "${pluginsDirPath}".`)
    }
}

module.exports = ScaffoldManager;