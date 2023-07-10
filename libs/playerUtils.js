const bcrypt = require('bcryptjs');
const merge = require('deepmerge');
const fetch = require('node-fetch');
const authUtils = rootRequire('/libs/authUtils');
const cryptoUtils = rootRequire('/libs/cryptoUtils');
const evmUtils = rootRequire('/libs/evmUtils');
const fileUtils = rootRequire('/libs/fileUtils');
const redisUtils = rootRequire('/libs/redisUtils');
const walletUtils = rootRequire('/libs/walletUtils');

async function readPlayerData(playerId) {
  const playerDataKey = `${playerId}:player-data`;
  let playerData = await redisUtils.getObject(playerDataKey);

  if (!playerData) {
    try {
      playerData = await fileUtils.readS3File(
        process.env.S3_PLAYER_DATA_BUCKET,
        `${playerId}.json`,
      );

      await redisUtils.setObject(playerDataKey, playerData);
    } catch (error) { /* NOOP, player data likely doesn't exist */ }
  }

  return playerData || {};
}

async function writePlayerData(playerId, data) {
  const existingPlayerData = await readPlayerData(playerId);

  if (typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Player data must be an object.');
  }

  const playerData = merge(existingPlayerData, data, {
    arrayMerge: (destArr, sourceArr) => sourceArr,
  });

  await fileUtils.writeS3File(
    process.env.S3_PLAYER_DATA_BUCKET,
    `${playerId}.json`,
    JSON.stringify(playerData),
  );

  await redisUtils.setObject(`${playerId}:player-data`, playerData);

  return playerData;
}

async function authServicePlayer(game, username, serviceName, serviceCredential, accessTokenExpiresAt) {
  const salt = await cryptoUtils.kmsSymmetricDecrypt(game.saltCiphertext);
  let account;
  let serviceAuthLookup;
  let password;

  if (serviceName === 'discord') {
    const associatedClientId = await new Promise(resolve => {
      fetch('https://discord.com/api/oauth2/@me', {
        headers: { authorization: `Bearer ${serviceCredential}` },
      }).then(r => r.json()).then(r => resolve(r.application.id));
    });

    if (game.discordClientId !== associatedClientId) {
      throw new Error('Provided Discord access token is not associated with discord client id of this game.');
    }

    account = await new Promise(resolve => {
      fetch('https://discord.com/api/users/@me', {
        headers: { authorization: `Bearer ${serviceCredential}` },
      }).then(r => r.json()).then(resolve);
    });

    if (!account) {
      throw new Error('Invalid or expired Discord access token provided.');
    }

    username = username || `${account.username}${account.discriminator}`;
    serviceAuthLookup = `discord-${cryptoUtils.sha3(account.id)}`;
    password = cryptoUtils.pbkdf2(account.id, salt);
  }

  if (serviceName === 'wallet') {
    const { message, signature } = JSON.parse(serviceCredential);
    const address = evmUtils.verifyMessageAndReturnAddress(message, signature);

    serviceAuthLookup = `wallet-${cryptoUtils.sha3(address)}`;
    password = cryptoUtils.pbkdf2(signature, salt);
  }

  try {
    const player = await getAuthenticatedServicePlayer(game.id, serviceAuthLookup, password);

    return player;
  } catch (error) {
    return createPlayer({ game, username, password, serviceAuthLookup, accessTokenExpiresAt });
  }
}

async function createPlayer({ game, username, password, serviceAuthLookup, recoveryEmail, accessTokenExpiresAt }) {
  if (!username) {
    throw new Error('A username must be provided.');
  }

  const playerExists = await prisma.player.findFirst({
    where: {
      gameId: game.id,
      username,
    },
  });

  if (playerExists) {
    throw new Error(`A player for this game with the username ${username} already exists.`);
  }

  // create wallet
  const walletDecryptKey = cryptoUtils.pbkdf2(password);
  const generatedWallet = walletUtils.generateRandomWallet();
  const walletCiphertext = cryptoUtils.aesEncryptWallet(generatedWallet, walletDecryptKey);
  const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(10));

  // create code backup wallets
  const walletBackupCodes = [];
  const walletBackupCiphertexts = [];

  for (let i = 0; i < 6; i++) {
    const code = authUtils.generateToken('', 8);

    walletBackupCodes.push(code);
    walletBackupCiphertexts.push(cryptoUtils.aesEncryptWallet(generatedWallet, code));
  }

  // create email recovery backup wallet
  let recoveryEmailLookup;

  if (recoveryEmail) {
    const salt = await cryptoUtils.kmsSymmetricDecrypt(game.saltCiphertext);
    const recoveryEmailDecryptKey = cryptoUtils.pbkdf2(recoveryEmail, salt);
    walletBackupCiphertexts.push(cryptoUtils.aesEncryptWallet(generatedWallet, recoveryEmailDecryptKey));
    recoveryEmailLookup = cryptoUtils.sha3(`${recoveryEmail}${salt}`);

    const playerWithRecoveryEmailExists = await prisma.player.findFirst({
      where: {
        gameId: game.id,
        recoveryEmailLookup,
      },
    });

    if (playerWithRecoveryEmailExists) {
      throw new Error(`A player already exists for this game with the recovery email ${recoveryEmail}.`);
    }
  }

  // create player
  const player = await prisma.player.create({
    data: {
      username,
      password: hashedPassword,
      accessToken: authUtils.generateToken('player_at_'),
      serviceAuthLookup,
      recoveryEmailLookup,
      accessTokenExpiresAt: accessTokenExpiresAt ? new Date(accessTokenExpiresAt * 1000) : undefined,
      game: {
        connect: { id: game.id },
      },
      wallet: {
        create: {
          address: generatedWallet.address,
          ciphertext: walletCiphertext,
          backupCiphertexts: walletBackupCiphertexts,
        },
      },
    },
    include: {
      wallet: {
        select: { id: true, address: true },
      },
    },
  });

  player.custodialWallet = player.wallet;
  player.backupCodes = walletBackupCodes;
  player.walletDecryptKey = walletDecryptKey;

  delete player.password;

  return _normalizePlayer(player, true, false, false);
}

async function getAuthenticatedServicePlayer(gameId, serviceAuthLookup, password) {
  const player = await _getFromDatabase('findFirst', { gameId, serviceAuthLookup });

  if (!player) {
    throw new Error('Player for this game for provided auth service does not exist.');
  }

  if (!bcrypt.compareSync(password, player.password)) {
    throw new ResponseError(401, 'Incorrect password.');
  }

  player.walletDecryptKey = cryptoUtils.pbkdf2(password);

  return _normalizePlayer(player, true, false, false);
}

async function getAuthenticatedPlayer(gameId, username, password) {
  const player = await _getFromDatabase('findFirst', { gameId, username });

  if (!player) {
    throw new Error(`Player for this game with username ${username} does not exist.`);
  }

  if (!player.password) {
    throw new Error(`Player for this game with username ${username} must be logged into through an applicable connected profile or social sign-in.`);
  }

  if (!bcrypt.compareSync(password, player.password)) {
    throw new ResponseError(401, 'Incorrect username or password.');
  }

  player.walletDecryptKey = cryptoUtils.pbkdf2(password);

  return _normalizePlayer(player, true, false, false);
}


async function getAuthenticatedProfilePlayer(gameId, profileId, username) {
  const player = await _getFromDatabase('findFirst', { gameId, profileId, username });

  if (!player) {
    throw new Error(`Player for this game with connected profile and username ${username} does not exist.`);
  }

  return _normalizePlayer(player, true, false, false);
}

async function getAuthorizedPlayer(accessToken) {
  const player = await _getFromDatabase('findUnique', { accessToken });

  if (!player) {
    return false;
  }

  return _normalizePlayer(player, false, true, false);
}

async function getPublicPlayer(playerId) {
  const player = await _getFromDatabase('findUnique', { id: playerId });

  if (!player) {
    throw new Error('Player does not exist for provided playerId.');
  }

  return _normalizePlayer(player, false, false, false);
}

async function getPublicPlayerByLookup(lookup, includeAccessToken = false, includePassword = false, includeRecoveryEmailLookup = false, includeRecoveryEmailCode = false) {
  const player = await _getFromDatabase('findFirst', lookup);

  if (!player) {
    throw new Error('Player does not exist for this game.');
  }

  return _normalizePlayer(player, includeAccessToken, includePassword, includeRecoveryEmailLookup, includeRecoveryEmailCode);
}

async function getPublicPlayers(gameId) {
  const players = await _getFromDatabase('findMany', { gameId });

  return players.map(player => {
    delete player.accessToken;

    return _normalizePlayer(player, false, false, false);
  });
}

function _normalizePlayer(player, includeAccessToken, includePassword, includeRecoveryEmailLookup, includeRecoveryEmailCode) {
  if (player.profile) {
    const { profile } = player;
    player.custodialWallet = player.wallet;
    player.wallet = profile.connectedWallet || profile.wallet;

    profile.custodialWallet = profile.wallet;
    profile.wallet = profile.connectedWallet || profile.wallet;

    delete profile.connectedWallet;
  } else {
    player.custodialWallet = player.wallet;
    player.wallet = player.connectedWallet || player.wallet;
  }

  if (!includeAccessToken) {
    delete player.accessToken;
  }

  if (!includePassword) {
    delete player.password;
  }

  if (!includeRecoveryEmailLookup) {
    delete player.recoveryEmailLookup;
  }

  if (!includeRecoveryEmailCode) {
    delete player.recoveryEmailCode;
  }

  delete player.connectedWallet;
  delete player.serviceAuthLookup;

  return player;
}

async function _getFromDatabase(findFunction, where) {
  return await prisma.player[findFunction]({
    where,
    include: {
      wallet: {
        select: { id: true, address: true },
      },
      connectedWallet: {
        select: { id: true, address: true },
      },
      profile: {
        select: {
          id: true,
          wallet: {
            select: { id: true, address: true },
          },
          connectedWallet: {
            select: { id: true, address: true },
          },
        },
      },
    },
  });
}

/*
 * Export
 */

module.exports = {
  readPlayerData,
  writePlayerData,
  authServicePlayer,
  createPlayer,
  getAuthenticatedPlayer,
  getAuthenticatedServicePlayer,
  getAuthenticatedProfilePlayer,
  getAuthorizedPlayer,
  getPublicPlayer,
  getPublicPlayerByLookup,
  getPublicPlayers,
};
