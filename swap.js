// test a simple trade in PancakeSwap
require('dotenv').config();
const Web3 = require('web3');
const BigNumber = require('bignumber.js');

const abis = require('./abis');
const { mainnet: addresses } = require('./addresses');
const Swapcontract = require('./build/contracts/Swapcontract.json')

const web3 = new Web3(
    new Web3.providers.HttpProvider(process.env.BSC_HTTPS)
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

const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const fromTokens = ['WBNB'];
const fromToken = [
    '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' // WBNB
];
const fromTokenDecimals = [18];

const toTokens = ['USDC'];
const toToken = [
    '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d' // USDC
];
const toTokenDecimals = [18];

// we need ERC20 ABI
const erc20ABI = require('./abis/erc20.json');
const usdcToken = new web3.eth.Contract(erc20ABI, toToken[0]);

const amount = process.env.TEST_AMOUNT;

const swap = async () => {
    const networkId = await web3.eth.net.getId();
    const pairAddress = await pancakeFactory.methods.getPair(fromToken[0], toToken[0]).call();
    console.log(`pairAddress ${toTokens[0]}/${fromTokens[0]} is ${pairAddress}`);

    // we need swap contract
    const swapcontract = new web3.eth.Contract(
        Swapcontract.abi,
        Swapcontract.networks[networkId].address
    );

    const unit0 = await new BigNumber(amount);
    const amount0 = await new BigNumber(unit0).shiftedBy(fromTokenDecimals[0]);

    console.log(`Trading ${toTokens[0]}/${fromTokens[0]} ...`);
    console.log(`Input amount of ${fromTokens[0]}: ${unit0.toString()}`);

    // The quote currency needs to be WBNB
    let tokenIn, tokenOut;
    tokenIn = fromToken[0];
    tokenOut = toToken[0];
    console.log(`tokenIn: ${tokenIn}, tokenOut: ${tokenOut}`);

    // The quote currency is not WBNB
    if (typeof tokenIn === 'undefined') {
        return;
    }

    // call getAmountsOut in PancakeSwap
    const amounts = await pancakeRouter.methods.getAmountsOut(amount0, [tokenIn, tokenOut]).call();
    const unit1 = await new BigNumber(amounts[1]).shiftedBy(-toTokenDecimals[0]);
    const amount1 = await new BigNumber(amounts[1]);
    console.log(`
        Swaping token at PancakeSwap DEX
        =================
        tokenIn: ${unit0.toString()} ${fromTokens[0]}
        tokenOut: ${unit1.toString()} ${toTokens[0]}
    `);

    const tx = await swapcontract.methods.startSwap(
        tokenIn,
        tokenOut,
        amount0,
        0,
    );
    
    /* const [gasPrice, gasCost] = await Promise.all([
        web3.eth.getGasPrice(),
        tx.estimateGas({from: admin}),
    ]); */

    // const txCost = web3.utils.toBN(gasCost) * web3.utils.toBN(gasPrice);
    // console.log(`Transaction cost: ${txCost}`);
    const data = tx.encodeABI();
    const txData = {
        from: admin,
        to: swapcontract.options.address,
        data,
        gas: 310000,
        gasPrice: 5000000000, // 5Gwei
    };
    const receipt = await web3.eth.sendTransaction(txData);
    console.log(`Transaction hash: ${receipt.transactionHash}`);
}

swap();
