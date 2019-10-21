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

const assert = require('assert');

const {encryptSecret, decryptSecret, loadSecrets} = require('./encryption.js')


const maybeEncryptable = [
    'some_hostname',                        // not accepted for decryption
    'enc:password'                          // labeled for encryption
]
const maybeDecryptable = [
    "some_hostname",                        // not encrypted
    "a7b3506d886db00d471f5d8ede48cbab",     // encrypted, labeled with "enc"
    "362ac605b23681d3cda8472c49e29cb0"      // encrypted, NOT labeled with "enc"
];

const [key, iv] = loadSecrets("testKey.pem");

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
