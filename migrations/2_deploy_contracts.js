const Flashswap = artifacts.require("Flashswap");

module.exports = function (deployer) {
  deployer.deploy(Flashswap);
};
