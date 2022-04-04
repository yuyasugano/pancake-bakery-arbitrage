require('dotenv').config();
const Web3 = require('web3');
const BigNumber = require('bignumber.js');
const { performance } = require('perf_hooks');

const Flashswap = require('./build/contracts/Flashswap.json');
const BlockSubscriber = require('./src/block_subscriber');
const TransactionSender = require('./src/transaction_send');

const fs = require('fs');
const util = require('util');
const request = require('async-request');

var log_file = fs.createWriteStream(__dirname + '/log_arbitrage.txt', { flags: 'w' });
var log_stdout = process.stdout;
console.log = function (d) {
    log_file.write(util.format(d) + '\n');
    log_stdout.write(util.format(d) + '\n');
};

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

const { mainnet: addresses } = require('./addresses');
const { address: admin } = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY);

const prices = {};
const flashswap = new web3.eth.Contract(
    Flashswap.abi,
    Flashswap.networks[process.env.NETWORKID].address
);

const BNB_MAINNET = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const BUSD_MAINNET = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';

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

const pairs = [
    {
        name: 'BNB to BUSD, pancake>panther',
        amountTokenPay: process.env.BNB_AMOUNT,
        tokenPay: BNB_MAINNET,
        tokenSwap: BUSD_MAINNET,
        sourceRouter: addresses.pancake.router,
        targetRouter: addresses.panther.router,
        sourceFactory: addresses.pancake.factory,
    },
    {
        name: 'BNB to BUSD, panther>pancake',
        amountTokenPay: process.env.BNB_AMOUNT,
        tokenPay: BNB_MAINNET,
        tokenSwap: BUSD_MAINNET,
        sourceRouter: addresses.panther.router,
        targetRouter: addresses.pancake.router,
        sourceFactory: addresses.panther.factory,
    },
    {
        name: 'BNB to BUSD, pancake>ape',
        amountTokenPay: process.env.BNB_AMOUNT,
        tokenPay: BNB_MAINNET,
        tokenSwap: BUSD_MAINNET,
        sourceRouter: addresses.pancake.router,
        targetRouter: addresses.ape.router,
        sourceFactory: addresses.pancake.factory,
    },
    {
        name: 'BNB to BUSD, ape>pancake',
        amountTokenPay: process.env.BNB_AMOUNT,
        tokenPay: BNB_MAINNET,
        tokenSwap: BUSD_MAINNET,
        sourceRouter: addresses.ape.router,
        targetRouter: addresses.pancake.router,
        sourceFactory: addresses.ape.factory,
    },
    {
        name: 'BNB to BUSD, pancake>bakery',
        amountTokenPay: process.env.BNB_AMOUNT,
        tokenPay: BNB_MAINNET,
        tokenSwap: BUSD_MAINNET,
        sourceRouter: addresses.pancake.router,
        targetRouter: addresses.bakery.router,
        sourceFactory: addresses.pancake.factory,
    },
    {
        name: 'BNB to BUSD, bakery>pancake',
        amountTokenPay: process.env.BNB_AMOUNT,
        tokenPay: BNB_MAINNET,
        tokenSwap: BUSD_MAINNET,
        sourceRouter: addresses.bakery.router,
        targetRouter: addresses.pancake.router,
        sourceFactory: addresses.bakery.factory,
    }
]

const init = async () => {
    console.log('starting: ', JSON.stringify(pairs.map(p => p.name)));

    const transactionSender = TransactionSender.factory(process.env.WSS_BLOCKS.split(','));

    let nonce = await web3.eth.getTransactionCount(admin);
    let gasPrice = await web3.eth.getGasPrice();

    setInterval(async () => {
        nonce = await web3.eth.getTransactionCount(admin);
    }, 1000 * 19);

    setInterval(async () => {
        gasPrice = await web3.eth.getGasPrice()
    }, 1000 * 60 * 3);

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
    setInterval(handler, 1000 * 60 * 5);

    const onBlock = async (block, web3, provider) => {
        const start = performance.now();
        const calls = [];

        // const flashswap = new web3.eth.Contract(
        //     Flashswap.abi,
        //     Flashswap.networks[process.env.NETWORKID].address
        // );

        pairs.forEach((pair) => {
            calls.push(async () => {
                // 1e18 is a decimal for amoutTokenPay, you will need to change it based on currency
                const check = await flashswap.methods.check(pair.tokenPay, pair.tokenSwap, new BigNumber(pair.amountTokenPay * 1e18), pair.sourceRouter, pair.targetRouter).call();

                const profit = check[0];

                let s = pair.tokenPay.toLowerCase();
                const price = prices[s];
                if (!price) {
                    console.log('invalid price', pair.tokenPay);
                    return;
                }

                const profitUsd = profit / 1e18 * price;
                const percentage = (100 * (profit / 1e18)) / pair.amountTokenPay;
                console.log(`[${block.number}] [${new Date().toLocaleString()}]: [${provider}] [${pair.name}] Arbitrage checked! Expected profit: ${(profit / 1e18).toFixed(3)} $${profitUsd.toFixed(2)} - ${percentage.toFixed(2)}%`);

                if (profit > 0) {
                    console.log(`[${block.number}] [${new Date().toLocaleString()}]: [${provider}] [${pair.name}] Arbitrage opportunity found! Expected profit: ${(profit / 1e18).toFixed(3)} $${profitUsd.toFixed(2)} - ${percentage.toFixed(2)}%`);

                    const tx = flashswap.methods.startArbitrage(
                        block.number + process.env.BLOCKNUMBER,
                        pair.tokenPay,
                        pair.tokenSwap,
                        new BigNumber(pair.amountTokenPay * 1e18),
                        pair.sourceRouter,
                        pair.targetRouter,
                        pair.sourceFactory,
                    );

                    let estimateGas
                    try {
                        estimateGas = await tx.estimateGas({from: admin});
                    } catch (e) {
                        console.log(`[${block.number}] [${new Date().toLocaleString()}]: [${pair.name}]`, 'gasCost error', e.message);
                        return;
                    }

                    const myGasPrice = new BigNumber(gasPrice).plus(gasPrice * 0.2212).toString();
                    const txCostBNB = Web3.utils.toBN(estimateGas) * Web3.utils.toBN(myGasPrice);

                    // calculate the estimated gas cost in USD
                    let gasCostUsd = (txCostBNB / 1e18) * prices[BNB_MAINNET.toLowerCase()];
                    const profitMinusFeeInUsd = profitUsd - gasCostUsd;

                    if (profitMinusFeeInUsd < 0.6) {
                        console.log(`[${block.number}] [${new Date().toLocaleString()}] [${provider}]: [${pair.name}] stopped: `, JSON.stringify({
                            profit: "$" + profitMinusFeeInUsd.toFixed(2),
                            profitWithoutGasCost: "$" + profitUsd.toFixed(2),
                            gasCost: "$" + gasCostUsd.toFixed(2),
                            duration: `${(performance.now() - start).toFixed(2)} ms`,
                            provider: provider,
                            myGasPrice: myGasPrice.toString(),
                            txCostBNB: txCostBNB / 1e18,
                            estimateGas: estimateGas,
                        }));
                    }

                    if (profitMinusFeeInUsd > 0.6) {
                        console.log(`[${block.number}] [${new Date().toLocaleString()}] [${provider}]: [${pair.name}] and go: `, JSON.stringify({
                            profit: "$" + profitMinusFeeInUsd.toFixed(2),
                            profitWithoutGasCost: "$" + profitUsd.toFixed(2),
                            gasCost: "$" + gasCostUsd.toFixed(2),
                            duration: `${(performance.now() - start).toFixed(2)} ms`,
                            provider: provider,
                        }));

                        const data = tx.encodeABI();
                        const txData = {
                            from: admin,
                            to: flashswap.options.address,
                            data: data,
                            gas: estimateGas,
                            gasPrice: new BigNumber(myGasPrice),
                            nonce: nonce
                        };

                        let number = performance.now() - start;
                        if (number > 1500) {
                            console.error('out of time window: ', number);
                            return;
                        }

                        console.log(`[${block.number}] [${new Date().toLocaleString()}] [${provider}]: sending transactions...`, JSON.stringify(txData))

                        try {
                            await transactionSender.sendTransaction(txData);
                        } catch (e) {
                            console.error('transaction error', e);
                        }
                    }
                }
            })
        })

        try {
            await Promise.all(calls.map(fn => fn()));
        } catch (e) {
            console.log('error', e)
        }

        let number = performance.now() - start;
        if (number > 1500) {
            console.error('warning to slow', number);
        }

        if (block.number % 40 === 0) {
            console.log(`[${block.number}] [${new Date().toLocaleString()}]: alive (${provider}) - took ${number.toFixed(2)} ms`);
        }
    };

    BlockSubscriber.subscribe(process.env.WSS_BLOCKS.split(','), onBlock);
}

init();    

