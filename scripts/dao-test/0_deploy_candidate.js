const hre = require("hardhat");
require('dotenv').config()
const {
  keccak256,
} = require("web3-utils");

const DAOCommitteeProxyABI = require("../../abi/DAOCommittee.json");

async function main() {
  const [admin] = await hre.ethers.getSigners();

  let DAOCommitteeProxy = "0x543550A8B8528A7Bcb4Ca42230F4a8C8117cdFDb";

  const DAOCommittee = await hre.ethers.getContractAt(DAOCommitteeProxyABI.abi, DAOCommitteeProxy, hre.ethers.provider);

  let tx = await DAOCommittee.connect(admin).createCandidate("20220419Test");

  console.log("tx:", tx.hash);

  await tx.wait();
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
