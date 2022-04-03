# Pancake & BakerySwap arbitrage
 
A sample application invokes a flashloan with `Flash Swaps` and a monitoring tool in Node.js.
To know details about `Flash Swaps`: visit https://uniswap.org/docs/v2/core-concepts/flash-swaps/
  
Article: visit https://yuyasugano.medium.com/arbitrage-party-between-pancakeswap-and-bakeryswap-apeswap-b055af13e4fc  
  
## Disclaimer
This repo is not either an investment advice or a recommendation or solicitation to buy or sell any investment and should not be used in the evaluation of the merits of making any investment decision. It should not be relied upon for accounting, legal or tax advice or investment recommendations. The contents reflected herein are subject to change without being updated. 

The codes are written for informational and educational purpose only, https and websocket endpoints might not work well if those endpoint have been depreciated. Please find other available endpoints in that case. Thanks for your understanding.
 
## Links
 
 * https://yuyasugano.medium.com/arbitrage-party-between-pancakeswap-and-bakeryswap-apeswap-b055af13e4fc
 * https://github.com/Haehnchen/uniswap-arbitrage-flash-swap 
 * https://github.com/Uniswap/uniswap-v2-periphery/blob/master/contracts/examples/ExampleFlashSwap.sol
  
## Infrastructure
 
Basically arbitrage opportunity dont last long, your transaction must make it into the next block. So you have <3 seconds watching for opportunities, decide and execute transaction. Sometimes there are also a chance to 2-3 have block, see example below. `BLOCKNUMBER` in the environmental variables can be configured within how many blocks a transaction should be processed. 
  
```
[7920960] [6/1/2021, 5:50:37 PM]: alive (bsc-ws-node.nariox.org) - took 308.42 ms
[7920991] [6/1/2021, 5:52:09 PM]: [bsc-ws-node.nariox.org] [BAKE/BNB ape>bakery] Arbitrage opportunity found! Expected profit: 0.007 $2.43 - 0.10%
[7920991] [6/1/2021, 5:52:09 PM] [bsc-ws-node.nariox.org]: [BAKE/BNB ape>bakery] and go:  {"profit":"$1.79","profitWithoutGasCost":"$2.43","gasCost":"$0.64","duration":"539.35 ms","provider":"bsc-ws-node.nariox.org"}
[7920992] [6/1/2021, 5:52:13 PM]: [bsc-ws-node.nariox.org] [BAKE/BNB ape>bakery] Arbitrage opportunity found! Expected profit: 0.007 $2.43 - 0.10%
[7920992] [6/1/2021, 5:52:13 PM] [bsc-ws-node.nariox.org]: [BAKE/BNB ape>bakery] and go:  {"profit":"$1.76","profitWithoutGasCost":"$2.43","gasCost":"$0.67","duration":"556.28 ms","provider":"bsc-ws-node.nariox.org"}
[7921000] [6/1/2021, 5:52:37 PM]: alive (bsc-ws-node.nariox.org) - took 280.54 ms
```
 
## software version
 
Ensure your `node` and `truffle` version is higher than these:
```sh
$ node -v
v14.17.6
$ truffle version
Truffle v5.3.7 (core: 5.3.7)
Solidity - >=0.6.6 <0.8.0 (solc-js)
Node v14.17.6
Web3.js v1.3.6
```
   
## environment variables
 
```
TEST_AMOUNT=0.005
BNB_AMOUNT=1000
WALLET_ADDRESS=<your wallet address>
PRIVATE_KEY=<your private key>
PRIVATE_TEST_KEY=<your test private key>
NETWORKID=56
BLOCKNUMBER=3
BSC_WSS=wss://bsc-ws-node.nariox.org:443
BSC_HTTPS=https://bsc-dataseed.binance.org/
BSC_TEST_HTTPS=https://data-seed-prebsc-1-s1.binance.org:8545/
MORALIS_BSC=https://speedy-nodes-nyc.moralis.io/<your account>/bsc/mainnet
WSS_BLOCKS=wss://bsc-ws-node.nariox.org:443
```
 
## setup steps
  
1. Rename `.env.template` to `.env` and fill out required information
2. Configure `truffle-config.js` with appropriate parameters (if you deploy a contract)
3. Install node.js packages and compile a smart contract code
```sh
npm install
truffle compile
```
4. Migrate the contract to the network (confirm if you do this in BSC mainnet)
```sh
truffle migrate --network mainnet
```
 
## License
 
This library is licensed under the MIT License. 
