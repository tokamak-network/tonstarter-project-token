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

  const ERC20BFactory = await hre.ethers.getContractFactory("ERC20BFactory");
  const erc20BFactory = await ERC20BFactory.deploy();

  let tx = await erc20BFactory.deployed();

  console.log("tx:", tx.deployTransaction.hash);
  console.log("ERC20BFactory deployed to:", erc20BFactory.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
