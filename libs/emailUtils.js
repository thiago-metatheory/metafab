const fs = require('fs');
const aws = require('aws-sdk');
const gameVerificationEmailHTML = fs.readFileSync('./emails/gameVerification.html').toString();

const ses = new aws.SES({ region: process.env.AWS_REGION_OVERRIDE || 'us-east-1' });
const replyToAddress = process.env.AWS_SES_REPLY_TO_ADDRESS || 'support@trymetafab.com';
const source = process.env.AWS_SES_SOURCE || 'support@trymetafab.com';

async function sendGameVerificationEmail(email, gameId, code) {

  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const verificationUrl = `https://api.trymetafab.com/v1/games/${gameId}/verify?code=${encodeURIComponent(code)}`;

  return ses.sendEmail({
    Destination: {
      ToAddresses: [ email ],
    },
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: gameVerificationEmailHTML.replace('{GAME_VERIFICATION_LINK}', verificationUrl),
        },
        Text: {
          Charset: 'UTF-8',
          Data: 'Welcome to MetaFab, the fastest way to build blockchain based game currencies, digital collectibles and more into your games!\n\n' +
                `Please click here to verify your email address and get started: ${verificationUrl}\n\n`,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: 'Welcome To MetaFab - Verify Your Email & Get Started',
      },
    },
    ReplyToAddresses: [ replyToAddress ],
    Source: source,
  }).promise();
}

async function sendPlayerRecoveryEmail(email, game, player, recoveryEmailDecryptKey, recoveryEmailCode, redirectUri) {

  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  redirectUri = new URL(redirectUri || 'https://connect.trymetafab.com/recover/');
  redirectUri.searchParams.set('id', player.id);
  redirectUri.searchParams.set('username', player.username);
  redirectUri.searchParams.set('recoveryEmailDecryptKey', recoveryEmailDecryptKey);
  redirectUri.searchParams.set('recoveryEmailCode', recoveryEmailCode);

  const recoveryUrl = redirectUri.toString();

  return ses.sendEmail({
    Destination: {
      ToAddresses: [ email ],
    },
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: `Hi ${player.username}, it looks like you requested a link to reset your ${game.name} account password.\n\n` +
                `Please click here to reset your password: <a href="${recoveryUrl}">Reset Your Password</a>` +
                'If the above link does not work, please copy and paste the link below...\n\n' +
                `${recoveryUrl}`,
        },
        Text: {
          Charset: 'UTF-8',
          Data: `Hi ${player.username}, it looks like you requested a link to reset your ${game.name} account password.\n\n` +
                `Please click here to reset your password: ${recoveryUrl}`,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: `${game.name} - Reset Your Password`,
      },
    },
    ReplyToAddresses: [ replyToAddress ],
    Source: source,
  }).promise();
}

async function sendProfileRecoveryEmail(email, ecosystem, profile, recoveryEmailDecryptKey, recoveryEmailCode, redirectUri) {

  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  redirectUri = new URL(redirectUri || 'https://connect.trymetafab.com/recover/');
  redirectUri.searchParams.set('id', profile.id);
  redirectUri.searchParams.set('username', profile.username);
  redirectUri.searchParams.set('recoveryEmailDecryptKey', recoveryEmailDecryptKey);
  redirectUri.searchParams.set('recoveryEmailCode', recoveryEmailCode);
    
  const recoveryUrl = redirectUri.toString();

  return ses.sendEmail({
    Destination: {
      ToAddresses: [ email ],
    },
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: `Hi ${profile.username}, it looks like you requested a link to reset your ${ecosystem.name} account password.\n\n` +
                `Please click here to reset your password: <a href="${recoveryUrl}">Reset Your Password</a>\n\n` +
                'If the above link does not work, please copy and paste the link below...\n\n' +
                `${recoveryUrl}`,
        },
        Text: {
          Charset: 'UTF-8',
          Data: `Hi ${profile.username}, it looks like you requested a link to reset your ${ecosystem.name} account password.\n\n` +
                `Please click here to reset your password: ${recoveryUrl}`,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: `${ecosystem.name} - Reset Your Password`,
      },
    },
    ReplyToAddresses: [ replyToAddress ],
    Source: source,
  }).promise();
}

/*
 * Export
 */

module.exports = {
  sendGameVerificationEmail,
  sendPlayerRecoveryEmail,
  sendProfileRecoveryEmail,
};
