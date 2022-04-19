const { ethers } = require("hardhat");
const fs = require('fs');

async function deployERC20Recorder() {
  const [admin] = await ethers.getSigners();
  const ERC20RecorderContract = await ethers.getContractFactory("ERC20Recorder");
  const ERC20Recorder = await ERC20RecorderContract.connect(admin).deploy(
    "ERC20Recorder",
    "RE",
    admin.address,
    admin.address
  );
  await ERC20Recorder.deployed();
  return ERC20Recorder;
}

async function main() {
  const ERC20Recorder = await deployERC20Recorder();

  const layer2s = JSON.parse(await fs.readFileSync("./data/layer2s.json"));
  const stakers = JSON.parse(await fs.readFileSync("./data/stakers.json"));
  const stakesOfAllUsers = JSON.parse(await fs.readFileSync("./data/stakesOfAllUsers.json"));

  const [admin] = await ethers.getSigners();

  let accounts = [];
  let amounts = [];
  for (const staker of stakers) {
    let totalStaked = ethers.BigNumber.from(0);
    for (const layer2 of layer2s) {
      if (!stakesOfAllUsers[layer2]) {
        continue;
      }
      if (stakesOfAllUsers[layer2][staker]) {
        totalStaked = totalStaked.add(ethers.BigNumber.from(stakesOfAllUsers[layer2][staker]));
      }
    }

    if (totalStaked == 0) {
      continue;
    }
    
    accounts.push(staker);
    amounts.push(totalStaked);
    if (accounts.length == 100) {
      console.log(accounts.length);
      console.log(amounts.length);
      await (await ERC20Recorder.connect(admin).mintBatch(accounts, amounts)).wait();
      accounts = [];
      amounts = [];
    } 
  }

  if (accounts.length > 0) {
    console.log(accounts.length);
    console.log(amounts.length);
    await (await ERC20Recorder.connect(admin).mintBatch(accounts, amounts)).wait();
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });