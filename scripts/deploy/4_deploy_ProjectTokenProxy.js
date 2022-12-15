const hre = require("hardhat");
require("dotenv").config();
const { keccak256 } = require("web3-utils");

async function main() {
  const [admin] = await hre.ethers.getSigners();

  const ProjectTokenProxy = await hre.ethers.getContractFactory(
    "ProjectTokenProxy"
  );
  const projectTokenProxy = await ProjectTokenProxy.deploy(
    "TOS Project NFT",
    "TosPNT"
  );

  const tx = await projectTokenProxy.deployed();

  console.log("tx:", tx.deployTransaction.hash);
  console.log("projectTokenProxy deployed to:", projectTokenProxy.address);

  // await (await projectTokenProxy.connect(admin).upgradeTo("로직주소")).wait();

  // projectTokenProxy deployed to: 0x0525e7040c71fb6692324AA270788DEa41Eb0129
  await run("verify", {
    address: projectTokenProxy.address,
    constructorArgsParams: ["TOS Project NFT", "TosPNT"],
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
