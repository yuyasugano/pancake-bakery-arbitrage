require('dotenv').config();
const Web3 = require('web3');
const BigNumber = require('bignumber.js');

const abis = require('./abis');
const { mainnet: addresses } = require('./addresses');

// call WebSocket endpoint instead of https endpoint
const web3 = new Web3(
    new Web3.providers.WebsocketProvider(process.env.BSC_WSS)
);
// const { address: admin } = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY)

// party characters
// we need pancakeSwap
const pancakeFactory = new web3.eth.Contract(
    abis.pancakeFactory.pancakeFactory,
    addresses.pancake.factory
);
const pancakeRouter = new web3.eth.Contract(
    abis.pancakeRouter.pancakeRouter,
    addresses.pancake.router
);

// use ApeSwap instead of bakerySwap
const apeFactory = new web3.eth.Contract(
    abis.apeFactory.apeFactory,
    addresses.ape.factory
);
const apeRouter = new web3.eth.Contract(
    abis.apeRouter.apeRouter,
    addresses.ape.router
);

// we need bakerySwap
/* const bakeryFactory = new web3.eth.Contract(
    abis.bakeryFactory.bakeryFactory,
    addresses.bakery.factory
);
const bakeryRouter = new web3.eth.Contract(
    abis.bakeryRouter.bakeryRouter,
    addresses.bakery.router
); */

const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const fromTokens = ['WBNB'];
const fromToken = [
    '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' // WBNB
];
const fromTokenDecimals = [18];

const toTokens = ['BUSD'];
const toToken = [
    '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', // BUSD
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
                } else if (toToken[j] === WBNB) {
                    tokenIn = toToken[j];
                    tokenOut = fromToken[i];
                } else {
                    return;
                }

                // The quote currency is not WBNB
                if (typeof tokenIn === 'undefined') {
                    return;
                }

                // call getAmountsOut in PancakeSwap
                const amounts = await pancakeRouter.methods.getAmountsOut(amount0, [tokenIn, tokenOut]).call();
                console.log(`1: ${amounts[0]}, 2: ${amounts[1]}`);
                const unit1 = await new BigNumber(amounts[1]).shiftedBy(-toTokenDecimals[j]);
                const amount1 = await new BigNumber(amounts[1]);
                console.log(`
                    Buying token at PancakeSwap DEX
                    =================
                    tokenIn: ${unit0.toString()} ${fromTokens[i]}
                    tokenOut: ${unit1.toString()} ${toTokens[j]}
                `);

                // call getAmountsOut in ApeSwap
                const amounts2 = await apeRouter.methods.getAmountsOut(amount1, [tokenOut, tokenIn]).call();
                console.log(`1: ${amounts2[0]}, 2: ${amounts2[1]}`);
                const unit2 = await new BigNumber(amounts2[1]).shiftedBy(-fromTokenDecimals[i]);
                const amount2 = await new BigNumber(amounts2[1]);
                console.log(`
                    Buying back token at ApeSwap DEX
                    =================
                    tokenOut: ${unit1.toString()} ${toTokens[j]}
                    tokenIn: ${unit2.toString()} ${fromTokens[i]}
                `);

                let profit = await new BigNumber(amount2).minus(amount0);
                let unit3  = await new BigNumber(unit2).minus(unit0);
                // not consider transaction cost in here
                console.log(`Profit in ${fromTokens[i]}: ${unit3.toString()}`);

                if (profit > 0) {
                    console.log(`
                        Block # ${block.number}: Arbitrage opportunity found!
                        Expected profit: ${unit3.toString()} in ${fromTokens[i]}
                    `);
                } else {
                    console.log(`
                        Block # ${block.number}: Arbitrage opportunity not found!
                        Expected profit: ${unit3.toString()} in ${fromTokens[i]}
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
