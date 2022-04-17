const TestToken = artifacts.require("TestToken");

// porque async?
module.exports = async function (deployer, network, accounts) {
  console.log("Migrating TestToken to network", network);
  await deployer.deploy(TestToken);
};
