require('dotenv').config();
const Web3 = require('web3');
const BigNumber = require('bignumber.js');

const Flashswap = require('./build/contracts/Flashswaptest.json');
const TransactionSender = require('./src/transaction_send');

const fs = require('fs');
const util = require('util');
const request = require('async-request');

var log_file = fs.createWriteStream(__dirname + '/log_arbitrage_test.txt', { flags: 'w' });
var log_stdout = process.stdout;
console.log = function (d) {
    log_file.write(util.format(d) + '\n');
    log_stdout.write(util.format(d) + '\n');
};

const web3 = new Web3(
    new Web3.providers.HttpProvider(process.env.BSC_TEST_HTTPS, {
        reconnect: {
            auto: true,
            delay: 5000, // ms
            maxAttempts: 15,
            onTimeout: false
        }
    })
);

const { testnet: addresses } = require('./addresses');
const { address: admin } = web3.eth.accounts.wallet.add(process.env.PRIVATE_TEST_KEY);

const prices = {};
const flashswap = new web3.eth.Contract(
    Flashswap.abi,
    Flashswap.networks[97].address
);

const BNB_TESTNET = '0x094616F0BdFB0b526bD735Bf66Eca0Ad254ca81F';
const BUSD_TESTNET = '0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee';

const getPrices = async() => {
    const response = await request('https://api.coingecko.com/api/v3/simple/price?ids=binancecoin,ethereum,bitcoin,tether,usd-coin,busd&vs_currencies=usd');

    const prices = {};

    try {
        const json = JSON.parse(response.body);
        prices['0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'.toLowerCase()] = json.binancecoin.usd;
        prices['0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'.toLowerCase()] = json.busd.usd;
        prices['0x2170Ed0880ac9A755fd29B2688956BD959F933F8'.toLowerCase()] = json.ethereum.usd;
        prices['0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c'.toLowerCase()] = json.bitcoin.usd;
        prices['0x55d398326f99059ff775485246999027b3197955'.toLowerCase()] = json.tether.usd;
        // prices['??'.toLowerCase()] = json['usd-coin'].usd;
    } catch (e) {
        console.error(e)
        return {};
    }

    return prices;
}

const pair = {
    name: 'BNB to BUSD, pancake>pancake',
    amountTokenPay: process.env.BNB_TEST_AMOUNT,
    tokenPay: BNB_TESTNET,
    tokenSwap: BUSD_TESTNET,
    sourceRouter: addresses.pancake.router,
    targetRouter: addresses.pancake.router, // single router trade
    sourceFactory: addresses.pancake.factory,
}

const init = async () => {
    console.log('starting: ', pair.name);

    const transactionSender = TransactionSender.factory(process.env.BSC_TEST_HTTPS.split(','));

    let nonce = await web3.eth.getTransactionCount(admin);
    let gasPrice = await web3.eth.getGasPrice();
    let blocknumber = await web3.eth.getBlockNumber();

    const owner = await flashswap.methods.owner().call();
    console.log(`started: wallet ${admin} - gasPrice ${gasPrice} - contract owner: ${owner}`);

    let handler = async () => {
        const myPrices = await getPrices();
        if (Object.keys(myPrices).length > 0) {
            for (const [key, value] of Object.entries(myPrices)) {
                prices[key.toLowerCase()] = value;
            }
        }
    };

    await handler(); // get prices from CoinGecko

    const check = await flashswap.methods.check(pair.tokenPay, pair.tokenSwap, new BigNumber(pair.amountTokenPay * 1e18), pair.sourceRouter, pair.targetRouter).call();
    const profit = check[0];

    let s = pair.tokenPay.toLowerCase();
    const price = prices[s];
    if (!price) {
        console.log('invalid price', pair.tokenPay);
        return;
    }

    const tx = flashswap.methods.start(
        blocknumber + process.env.BLOCKNUMBER,
        pair.tokenPay,
        pair.tokenSwap,
        new BigNumber(pair.amountTokenPay * 1e18),
        pair.sourceRouter,
        pair.targetRouter,
        pair.sourceFactory,
    );

    let estimateGas;
    try {
        estimateGas = await tx.estimateGas({from: admin});
    } catch (e) {
        console.log(`[${blocknumber}] [${new Date().toLocaleString()}]: [${pair.name}]`, 'gasCost error', e.message);
        return;
    }

    const myGasPrice = new BigNumber(gasPrice).plus(gasPrice * 0.2212).toString();
    const txCostBNB = Web3.utils.toBN(estimateGas) * Web3.utils.toBN(myGasPrice);

    const data = tx.encodeABI();
    const txData = {
        from: admin,
        to: flashswap.options.address,
        data: data,
        gas: estimateGas,
        gasPrice: new BigNumber(myGasPrice),
        nonce: nonce
    };

    try {
        await transactionSender.sendTransaction(txData);
    } catch (e) {
        console.error('transaction error', e);
    }
}

init();   
