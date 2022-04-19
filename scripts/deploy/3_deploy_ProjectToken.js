const hre = require("hardhat");
require('dotenv').config()
const {
  keccak256,
} = require("web3-utils");

async function main() {

  const ProjectToken = await hre.ethers.getContractFactory("ProjectToken");
  const projectToken = await ProjectToken.deploy("ProjectToken","Starter");

  let tx = await projectToken.deployed();

  console.log("tx:", tx.deployTransaction.hash);
  console.log("projectToken deployed to:", projectToken.address);

  await run("verify", {
    address: projectToken.address,
    constructorArgsParams: ["ProjectToken","Starter"],
  });

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
