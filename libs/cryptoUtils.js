const aws = require('aws-sdk');
const cryptoJS = require('crypto-js');

const kms = new aws.KMS();

function aesEncrypt(plaintext, key) {
  try {
    return cryptoJS.AES.encrypt(plaintext, key).toString();
  } catch (error) {
    throw new Error('Could not encrypt.');
  }
}

function aesDecrypt(ciphertext, key) {
  try {
    return cryptoJS.AES.decrypt(ciphertext, key).toString(cryptoJS.enc.Utf8);
  } catch (error) {
    throw new Error('Could not decrypt');
  }
}

function aesEncryptWallet(walletObject, walletDecryptKey) {
  try {
    return aesEncrypt(JSON.stringify(walletObject), walletDecryptKey);
  } catch (error) {
    throw new Error('Wallet could not be encrypted.');
  }
}

function aesDecryptWallet(ciphertext, walletDecryptKey) {
  try {
    return JSON.parse(aesDecrypt(ciphertext, walletDecryptKey));
  } catch (error) {
    throw new Error('Wallet could not be decrypted, bad decrypt key. If you are using X-Wallet-Key on a game or player account created before January 27th, 2023 you may need to migrate it by doing a change password request which will enable support for X-Wallet-Decrypt-Key. Alternatively, you can use the deprecated plaintext password as the value of X-Wallet-Decrypt-Key.');
  }
}

async function kmsSymmetricEncrypt(plaintext) {
  try {
    const result = await kms.encrypt({
      KeyId: process.env.KMS_SYMMETRIC_ENCRYPTION_KEY_ID,
      Plaintext: plaintext,
    }).promise();

    return result.CiphertextBlob.toString('base64url');
  } catch (error) {
    throw new Error('Symmetric encryption failed.');
  }
}

async function kmsSymmetricDecrypt(base64Ciphertext) {
  try {
    const result = await kms.decrypt({
      KeyId: process.env.KMS_SYMMETRIC_ENCRYPTION_KEY_ID,
      CiphertextBlob: Buffer.from(base64Ciphertext, 'base64url'),
    }).promise();

    return result.Plaintext.toString();
  } catch(error) {
    throw new Error('Symmetric decryption failed.');
  }
}

function pbkdf2(password, plaintextSalt = undefined) {
  const salt = cryptoJS.SHA3(plaintextSalt || password, { outputLength: 256 });

  return cryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
  }).toString();
}

function sha3(input, rounds = 1) {
  let output = input;

  for (let i = 0; i < rounds; i++) {
    output = cryptoJS.SHA3(output, { outputLength: 256 });
  }

  return output.toString();
}

function generateStrongSalt() {
  return cryptoJS.lib.WordArray.random(512 / 8).toString();
}

/*
 * Export
 */

module.exports = {
  aesEncrypt,
  aesDecrypt,
  aesEncryptWallet,
  aesDecryptWallet,
  kmsSymmetricEncrypt,
  kmsSymmetricDecrypt,
  pbkdf2,
  sha3,
  generateStrongSalt,
};
