const hre = require("hardhat");
require("dotenv").config();
const { keccak256 } = require("web3-utils");
const AutoCoinageSnapshotABI = require("../../abi/AutoCoinageSnapshot.json");
async function main() {
  const [admin] = await hre.ethers.getSigners();

  const PowerTONSwapperProxy = await hre.ethers.getContractFactory(
    "PowerTONSwapperProxy"
  );
  const powerTONSwapperProxy = await PowerTONSwapperProxy.deploy();

  const tx = await powerTONSwapper.deployed();

  console.log("tx:", tx.deployTransaction.hash);
  console.log("PowerTONSwapper deployed to:", powerTONSwapper.address);

  await run("verify", {
    address: powerTONSwapper.address,
    constructorArgsParams: [],
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
