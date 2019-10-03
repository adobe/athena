module.exports = function generatedPlugin(Athena) {
    Athena.addFilter("chakramParseScenarioGiven", function (given, test) { // demo with multiple args
        if (test.config.name === "ccecoTest") {
            return `
                const host = "https://facebook.com"
                console.log("🔥 Switched host to " + host + " from a plugin" )
             `;
        }

        return given;
    }, 10);

    Athena.addFilter("chakramParseScenarioThen", function (then) {
        return `${then}`;
    }, 10);
};