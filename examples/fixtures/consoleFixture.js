const uuid = require("uuid/v1");

function uuidFixture() {
    const uid = uuid();
    console.log(uid);
    return uid;
}

module.exports = uuidFixture;