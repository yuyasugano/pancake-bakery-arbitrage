require('dotenv').config();
const Web3 = require('web3');
const BigNumber = require('bignumber.js');

const web3 = new Web3(
    new Web3.providers.WebsocketProvider(process.env.WSS_BLOCKS, {
        reconnect: {
            auto: true,
            delay: 5000, // ms
            maxAttempts: 15,
            onTimeout: false
        }
    })
);

const Flashswap = require('./build/contracts/Flashswap.json');

const BNB_MAINNET = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const BUSD_MAINNET = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';

const pancake = {
    router: "0x10ed43c718714eb63d5aa57b78b54704e256024e",
    factory: "0xca143ce32fe78f1f7019d7d551a6402fc5350c73",
    routerV1: "0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F",
    factoryV1: "0xBCfCcbde45cE874adCB698cC183deBcF17952812"
};

const panther = {
    router: "0xbe65b8f75b9f20f4c522e0067a3887fada714800",
    factory: "0x0eb58e5c8aa63314ff5547289185cc4583dfcbd5"
};

const pairs = [
    {
        name: 'BNB to BUSD, pancake>panther',
        amountTokenPay: 1000,
        tokenPay: BNB_MAINNET,
        tokenSwap: BUSD_MAINNET,
        sourceRouter: pancake.router,
        targetRouter: panther.router,
        sourceFactory: pancake.factory,
    },
    {
        name: 'BNB to BUSD, panther>pancake',
        amountTokenPay: 1000,
        tokenPay: BNB_MAINNET,
        tokenSwap: BUSD_MAINNET,
        sourceRouter: panther.router,
        targetRouter: pancake.router,
        sourceFactory: panther.factory,
    }
]

const init = async () => {

    const calls = [];

    const flashswap = new web3.eth.Contract(
        Flashswap.abi,
        Flashswap.networks[process.env.NETWORKID].address
    );

    pairs.forEach((pair) => {
        calls.push(async () => {
            const check = await flashswap.methods.check(pair.tokenPay, pair.tokenSwap, new BigNumber(pair.amountTokenPay * 1e18), pair.sourceRouter, pair.targetRouter).call();
            const profit = check[0];

            console.log(`profit: ${profit}.`);
        })
    })

    try {
        await Promise.all(calls.map(fn => fn()));
    } catch (e) {
        console.log('error: ', e);
    }
}

init();
