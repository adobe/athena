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

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

module.exports = {encryptSecret, decryptSecret, loadSecrets};

/**
 * Loads secrets needed for encryption/decryption from a given file. These are
 * the key (8 chars on the 1st line) and the  initialization vector (16 chars on the 2nd line).
 * @param secretFile string The name of the file.
 */
function loadSecrets(secretFile) {
    var secrets = fs.readFileSync(path.resolve(__dirname, secretFile), 'utf8');
    [key, iv] = secrets.split("\n");
    key =  Buffer.from(key);
    iv = Buffer.from(iv);

    return [key, iv];
}

function encryptSecret(plaintext, key, iv) {

    _encrypt = (plaintext, key, iv) => {
        let ciphertext = '';
        const cipher = crypto.createCipheriv('aes-192-cbc', key, iv);
    
        cipher.on('readable', () => {
            let chunk;
            while (null !== (chunk = cipher.read())) {
            ciphertext += chunk.toString('hex');
            }
        });
        cipher.write(plaintext);
        cipher.end();

        return ciphertext;
    }

    // only output encrypted text if the plaintext is labeled
    encryptionResult = _encrypt(plaintext, key, iv);
    encryptionResult = plaintext.indexOf("enc:") === -1 ? null : encryptionResult;

    return encryptionResult || plaintext;
}

function decryptSecret(ciphertext, key, iv) {
  
    _decrypt = (ciphertext, key, iv) => {
        let plaintext = '';
        const decipher = crypto.createDecipheriv('aes-192-cbc', key, iv);
        
        decipher.on('readable', () => {
            while (null !== (chunk = decipher.read())) {
                plaintext += chunk.toString('utf8');
            }
        });
        decipher.write(ciphertext, 'hex');
        decipher.end();
        
        return plaintext;
    };

    // only output decrypted text if label has been prepended beforehand
    decryptionResult = null;
    try {
        decryptionResult = _decrypt(ciphertext, key, iv);
        decryptionResult = decryptionResult.indexOf("enc:") === -1 ? null : decryptionResult;
    } catch(e) {
        if (!(e instanceof TypeError)) {
            throw e;
        }
    }

  return decryptionResult || ciphertext;
}
