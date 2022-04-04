const Flashswap = artifacts.require("Flashswap");
const Flashswaptest = artifacts.require("Flashswaptest");

module.exports = function (deployer, network) {
  if (network == "mainnet") {
    deployer.deploy(Flashswap);
  } else if (network == "testnet") {
    deployer.deploy(Flashswaptest);
  }
};
