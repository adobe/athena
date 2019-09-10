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
