const Flashswap = artifacts.require("Flashswap");
// const Flashswaptest = artifacts.require("Flashswaptest");

module.exports = function (deployer, network) {
  if (network == "mainnet") {
    deployer.deploy(Flashswap);
  } else {
    // Perform a different step otherwise.
    deployer.deploy(Flashswaptest);
  }
};
