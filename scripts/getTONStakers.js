const hre = require("hardhat");
const { ethers } = hre;
const fs = require('fs');

async function getLayer2s() {
  const layer2RegistryAddress = "0x0b3E174A2170083e770D5d4Cf56774D221b7063e";
  const layer2RegistryABI = JSON.parse(await fs.readFileSync("./abi/layer2Registry.json")).result;

  const layer2Registry = new ethers.Contract(
    layer2RegistryAddress,
    layer2RegistryABI,
    ethers.provider
  );

  const layer2s = []
  const numberOfLayer2s = await layer2Registry.numLayer2s()
  for (let i = 0; i < numberOfLayer2s; i++) {
    layer2s.push(await layer2Registry.layer2ByIndex(i))
  }
  console.log(layer2s);
  return layer2s;
} 

async function getTONStakers() {
  const stakers = [];
  const abi = [ "event Deposited(address indexed layer2, address depositor, uint256 amount)" ];
  const iface = new ethers.utils.Interface(abi);

  const filter = {
    address: "0x56E465f654393fa48f007Ed7346105c7195CEe43",
    fromBlock: 0,
    topics: [ethers.utils.id("Deposited(address,address,uint256)")]
  };
  const txs = await ethers.provider.getLogs(filter);

  for (const tx of txs) {
    const { transactionHash } = tx;
    const { logs } = await ethers.provider.getTransactionReceipt(transactionHash);
    const foundLog = logs.find(el => el && el.topics && el.topics.includes(ethers.utils.id("Deposited(address,address,uint256)")));
    if (!foundLog) continue;
    const parsedlog = iface.parseLog(foundLog);
    const { depositor } = parsedlog["args"];
    stakers.push(depositor);
  }
  
  console.log("length: ", stakers.length);
  return stakers;
}

async function getStakeOfAllUsers() {
  const seigManagerAddress = "0x0b3E174A2170083e770D5d4Cf56774D221b7063e";
  const seigManagerABI = JSON.parse(await fs.readFileSync("./abi/seigManager.json")).result;

  const seigManager = new ethers.Contract(
    seigManagerAddress,
    seigManagerABI,
    ethers.provider
  );

  const layer2s = await getLayer2s();
  const stakers = await getTONStakers();
  for (const layer2 of layer2s) {
    for (const staker of stakers) {
      await seigManager.stakeOf(layer2, staker);
    }
  }
}

async function main() {
  await getTONStakers();

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
