const pancakeMainnet = require('./pancake-mainnet.json');
const pancakeTestnet = require('./pancake-testnet.json');
const pantherMainnet = require('./panther-mainnet.json');
const bakeryMainnet = require('./bakery-mainnet.json');
const apeMainnet = require('./ape-mainnet.json');

module.exports = {
    mainnet: {
        pancake: pancakeMainnet,
        panther: pantherMainnet,
        bakery: bakeryMainnet,
        ape: apeMainnet,
    },
    testnet: {
        pancake: pancakeTestnet,
    },
};

