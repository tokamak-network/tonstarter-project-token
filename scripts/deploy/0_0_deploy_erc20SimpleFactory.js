const hre = require("hardhat");
require('dotenv').config()
const {
  keccak256,
} = require("web3-utils");

const {run} = require("hardhat");

async function main() {

  const SNAPSHOT_ROLE = keccak256("SNAPSHOT_ROLE");

  console.log('SNAPSHOT_ROLE',SNAPSHOT_ROLE);

  const ERC20SimpleFactory = await hre.ethers.getContractFactory("ERC20SimpleFactory");
  const erc20SimpleFactory = await ERC20SimpleFactory.deploy();

  let tx = await erc20SimpleFactory.deployed();

  console.log("tx:", tx.deployTransaction.hash);
  console.log("ERC20SimpleFactory deployed to:", erc20SimpleFactory.address);

  await run("verify", {
    address: erc20SimpleFactory.address,
    constructorArgsParams: [],
  });

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
