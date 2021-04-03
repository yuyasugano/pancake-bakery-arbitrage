# Pancake & BakerySwap arbitrage
 
A sample application invokes a flashloan with `Flash Swaps` and a monitoring tool in Node.js.
To know details about `Flash Swaps`: visit https://uniswap.org/docs/v2/core-concepts/flash-swaps/
 
## software version
 
Ensure your `node` and `truffle` version is higher than these:
```sh
$ node -v
v13.7.0
$ truffle version
Truffle v5.2.2 (core: 5.2.2)
Solidity v0.5.16 (solc-js)
Node v13.7.0
Web3.js v1.2.9
```
   
## environment variables
 
```
BNB_AMOUNT=100
WALLET_ADDRESS=0x<your wallet address>
PRIVATE_KEY=<private key>
BSS_WSS=wss://bsc-ws-node.nariox.org:443
BSS_HTTPS=https://bsc-dataseed.binance.org/
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
