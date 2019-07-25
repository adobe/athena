describe = function(title, fn) {
    let result = fn();
};

afterEach = function(fn) {

};

const chakram = require('chakram')

const expect = chakram.expect;

chakram.addProperty("spotify", function(){});
chakram.addMethod("error", function (respObj, status, message) {
    expect(respObj).to.have.schema(spotifyErrorSchema);
    expect(respObj).to.have.status(status);
    expect(respObj).to.have.json('error.message', message);
    expect(respObj).to.have.json('error.status', status);
});

describe('hope', function() {
   expect(true).to.be(true);
});