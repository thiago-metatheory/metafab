/*
 * Route: /games/:gameId/verify
 */

const formattingUtils = rootRequire('/libs/formattingUtils');
const readmeUtils = rootRequire('/libs/readmeUtils');
const transactionUtils = rootRequire('/libs/transactionUtils');
const walletUtils = rootRequire('/libs/walletUtils');

const router = express.Router({
  mergeParams: true,
});

/**
 * Undocumented API Endpoint, just used for verify flow
 */

router.get('/', asyncMiddleware(async (request, response) => {
  const { gameId } = request.params;
  const { code } = request.query;


  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      wallet: {
        select: { address: true },
      },
      fundingWallet: {
        select: { address: true },
      },
    },
  });

  if (!game) {
    throw new Error('Invalid game id.');
  }

  if (process.env.NODE_ENV === 'production' && game.verificationCode !== code) {
    throw new Error('Incorrect verification code.');
  }

  if (!game.verified) {
    await prisma.game.update({
      where: { id: gameId },
      data: { verified: true },
    });

    // transfer initial token in prod
    if (process.env.NODE_ENV === 'production') {
      (async () => {
        try {
          const chain = 'MATIC';
          const walletSigner = walletUtils.getWalletSigner(process.env.GAME_TOKEN_FAUCET_WALLET_KEY);

          console.log(await transactionUtils.executeTransfer({
            chain,
            walletSigner,
            toAddress: game.wallet.address,
            value: formattingUtils.parseUnits(2),
          }));

          console.log(await transactionUtils.executeTransfer({
            chain,
            walletSigner,
            toAddress: game.fundingWallet.address,
            value: formattingUtils.parseUnits(0.5),
          }));
        } catch (error) { console.log(error); }
      })();
    }
  }

  const authToken = readmeUtils.generateLoginAuthToken(game);

  response.redirect(`https://docs.trymetafab.com/docs/email-verified-welcome-to-metafab?auth_token=${authToken}`);
}));

/*
 * Export
 */

module.exports = router;
