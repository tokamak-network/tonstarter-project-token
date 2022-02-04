const hre = require("hardhat");
require('dotenv').config()
const {
  keccak256,
} = require("web3-utils");

async function main() {
  const MINTER_ROLE = keccak256("MINTER_ROLE");
  const SNAPSHOT_ROLE = keccak256("SNAPSHOT_ROLE");

  console.log('MINTER_ROLE',MINTER_ROLE);
  console.log('SNAPSHOT_ROLE',SNAPSHOT_ROLE);

  const ERC20AFactory = await hre.ethers.getContractFactory("ERC20AFactory");
  const erc20AFactory = await ERC20AFactory.deploy();

  let tx = await erc20AFactory.deployed();

  console.log("tx:", tx.deployTransaction.hash);
  console.log("ERC20AFactory deployed to:", erc20AFactory.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
