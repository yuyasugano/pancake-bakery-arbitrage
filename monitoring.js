require('dotenv').config();
const Web3 = require('web3');
const BigNumber = require('bignumber.js');

const abis = require('./abis');
const { mainnet: addresses } = require('./addresses');

const web3 = new Web3(
    new Web3.providers.WebsocketProvider(process.env.BSC_WSS)
);
const { address: admin } = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY)

// we need pancakeSwap
const pancakeFactory = new web3.eth.Contract(
    abis.pancakeFactory.pancakeFactory,
    addresses.pancake.factory
);
const pancakeRouter = new web3.eth.Contract(
    abis.pancakeRouter.pancakeRouter,
    addresses.pancake.router
);

// we need bakerySwap
const bakeryFactory = new web3.eth.Contract(
    abis.bakeryFactory.bakeryFactory,
    addresses.bakery.factory
);
const bakeryRouter = new web3.eth.Contract(
    abis.bakeryRouter.bakeryRouter,
    addresses.bakery.router
);

const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const fromTokens = ['WBNB'];
const fromToken = [
    '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' // WBNB
];
const fromTokenDecimals = [18];

const toTokens = ['BUSD'];
const toToken = [
    '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56' // BUSD
];
const toTokenDecimals = [18];
const amount = process.env.BNB_AMOUNT;

const init = async () => {
    const networkId = await web3.eth.net.getId();
    let subscription = web3.eth.subscribe('newBlockHeaders', (error, result) => {
        if (!error) {
            // console.log(result);
            return;
        }
        console.error(error);
    })
    .on("connected", subscriptionId => {
        console.log(`You are connected on ${subscriptionId}`);
    })
    .on('data', async block => {
        console.log('-------------------------------------------------------------');
        console.log(`New block received. Block # ${block.number}`);
        console.log(`GasLimit: ${block.gasLimit} and Timestamp: ${block.timestamp}`);

        for (let i = 0; i < fromTokens.length; i++) {
            for (let j = 0; j < toTokens.length; j++) {
                console.log(`Trading ${toTokens[j]}/${fromTokens[i]} ...`);

                const pairAddress = await pancakeFactory.methods.getPair(fromToken[i], toToken[j]).call();
                console.log(`pairAddress ${toTokens[j]}/${fromTokens[i]} is ${pairAddress}`);
                const unit0 = await new BigNumber(amount);
                const amount0 = await new BigNumber(unit0).shiftedBy(fromTokenDecimals[i]);
                console.log(`Input amount of ${fromTokens[i]}: ${amount0.toString()}`);

                // The quote currency needs to be WBNB
                let tokenIn, tokenOut;
                if (fromToken[i] === WBNB) {
                    tokenIn = fromToken[i];
                    tokenOut = toToken[j];
                }

                if (toToken[j] === WBNB) {
                    tokenIn = toToken[j];
                    tokenOut = fromToken[i];
                }

                // The quote currency is not WBNB
                if (typeof tokenIn === 'undefined') {
                    return;
                }

                // call getAmountsOut in PancakeSwap
                const amounts = await pancakeRouter.methods.getAmountsOut(amount0, [tokenIn, tokenOut]).call();
                const unit1 = await new BigNumber(amounts[1]).shiftedBy(-toTokenDecimals[j]);
                const amount1 = await new BigNumber(amounts[1]);
                console.log(`
                    Buying token at PancakeSwap DEX
                    =================
                    tokenIn: ${unit0.toString()} ${tokenIn}
                    tokenOut: ${unit1.toString()} ${tokenOut}
                `);

                // call getAmountsOut in BakerySwap
                const amounts2 = await bakeryRouter.methods.getAmountsOut(amount1, [tokenOut, tokenIn]).call();
                const unit2 = await new BigNumber(amounts2[1]).shiftedBy(-fromTokenDecimals[i]);
                const amount2 = await new BigNumber(amounts2[1]);
                console.log(`
                    Buying back token at BakerySwap DEX
                    =================
                    tokenOut: ${unit1.toString()} ${tokenOut}
                    tokenIn: ${unit2.toString()} ${tokenIn}
                `);

                let profit = await new BigNumber(amount2).minus(amount0);

                if (profit > 0) {
                    console.log(`
                        Block # ${block.number}: Arbitrage opportunity found!
                        Expected profit: ${profit}
                    `);
                } else {
                    console.log(`
                        Block # ${block.number}: Arbitrage opportunity not found!
                        Expected profit: ${profit}
                    `);
                }
            }
        }
    })
    .on('error', error => {
        console.log(error);
    });
}

init();
