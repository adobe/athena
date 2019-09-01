const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {encryptSecret, decryptSecret, loadSecrets} = require('./encryption.js')


const maybeEncryptable = [
    'some_hostname',                        // not accepted for decryption
    'enc:password'                          // labeled for encryption
]
const maybeDecryptable = [
    "some_hostname",                        // not encrypted
    "a7b3506d886db00d471f5d8ede48cbab",     // encrypted, labeled with "enc"
    "362ac605b23681d3cda8472c49e29cb0"      // encrypted, NOT labeled with "enc"
]

const [key, iv] = loadSecrets("testKey.pem")

// test encryption
encryptionResults = [];
maybeEncryptable.forEach(text => {
    encryptionResults.push(encryptSecret(text, key, iv));
});

assert.equal(encryptionResults[0], `${maybeDecryptable[0]}`);
assert.equal(encryptionResults[1], `${maybeDecryptable[1]}`);

// test decryption
decryptionResults = [];
maybeDecryptable.forEach(text => {
    decryptionResults.push(decryptSecret(text, key, iv));
});

assert.equal(decryptionResults[0], `${maybeEncryptable[0]}`);
assert.equal(decryptionResults[1], `${maybeEncryptable[1]}`);
assert.equal(decryptionResults[2], `${maybeDecryptable[2]}`);

console.log("SUCCESS");
