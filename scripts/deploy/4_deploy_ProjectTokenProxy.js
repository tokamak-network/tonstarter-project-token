const hre = require("hardhat");
require('dotenv').config()
const {
  keccak256,
} = require("web3-utils");

async function main() {
  const [admin] = await hre.ethers.getSigners();

  const ProjectTokenProxy = await hre.ethers.getContractFactory("ProjectTokenProxy");
  const projectTokenProxy = await ProjectTokenProxy.deploy("ProjectToken","Starter");

  let tx = await projectTokenProxy.deployed();

  console.log("tx:", tx.deployTransaction.hash);
  console.log("projectTokenProxy deployed to:", projectTokenProxy.address);


  await (await projectTokenProxy.connect(admin).upgradeTo("0x63e559c405BffC9507e109654c28BC283Cd6055C")).wait();


  //projectTokenProxy deployed to: 0x0525e7040c71fb6692324AA270788DEa41Eb0129
  await run("verify", {
    address: projectTokenProxy.address,
    constructorArgsParams: ["ProjectToken","Starter"],
  });

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
