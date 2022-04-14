const fs = require('fs');

const getLayer2List = async (layer2RegistryAddress) => {
    const layer2RegistryABI = JSON.parse(await fs.readFileSync("./abi/layer2Registry.json")).abi;
    const layer2Registry = new ethers.Contract(
        layer2RegistryAddress,
        layer2RegistryABI,
        ethers.provider
    );
    const layer2s = []
    const numberOfLayer2s = await layer2Registry.numLayer2s()
    for (let i = 0; i < numberOfLayer2s; i++) {
        let layerName = await layer2Registry.layer2ByIndex(i);
        layer2s.push(layerName.toLowerCase());
    }
    console.log("length: ", layer2s.length);
    await fs.writeFileSync("./data/layer2s.json", JSON.stringify(layer2s));
    return layer2s;
}

const getStakersList = async (depositManagerAddress, blockNumber) => {
    //https://daoapi.tokamak.network/v1/users?chainId=1&pagsize=10000
    const stakers = [];
    const abi = [ "event Deposited(address indexed layer2, address depositor, uint256 amount)" ];
    const iface = new ethers.utils.Interface(abi);

    const filter = {
      address: depositManagerAddress,
      fromBlock: 0,
      toBlock: parseInt(blockNumber),
      topics: [ethers.utils.id("Deposited(address,address,uint256)")]
    };

    try{
      const txs = await ethers.provider.getLogs(filter);
      console.log("length: ", txs.length);

      for (const tx of txs) {
        const { transactionHash } = tx;
        const { logs } = await ethers.provider.getTransactionReceipt(transactionHash);
        const foundLog = logs.find(el => el && el.topics && el.topics.includes(ethers.utils.id("Deposited(address,address,uint256)")));
        if (!foundLog) continue;
        const parsedlog = iface.parseLog(foundLog);
        let { depositor } = parsedlog["args"];
        depositor = depositor.toLowerCase();
        stakers.push(depositor);
      }
      console.log({ stakers });
      console.log("length: ", stakers.length);

    } catch(error){
      console.log('getStakersList error',error);
    }

    const stakersUnique = stakers.filter((v, idx, self) => self.indexOf(v) === idx);
    console.log("length: ", stakersUnique.length);
    await fs.writeFileSync("./data/stakers.json", JSON.stringify(stakersUnique));
    return stakers;
}

const getTONStakedAmount = async (seigManagerAddress) => {
    const seigManagerABI = require("../../abi/seigManager.json").abi;
    const seigManager = new ethers.Contract(
        seigManagerAddress,
        seigManagerABI,
        ethers.provider
    );

    const layer2s = JSON.parse(await fs.readFileSync("./data/layer2s.json"));
    const stakers = JSON.parse(await fs.readFileSync("./data/stakers.json"));
    const output = JSON.parse(await fs.readFileSync("./data/stakesOfAllUsers.json"));

    for (const layer2 of layer2s) {
        for (const staker of stakers) {
            if (!output[layer2])
                output[layer2] = {};
            if (output[layer2][staker]) {
                continue;
            }

            const staked = (await seigManager.stakeOf(layer2, staker)).toString();
            output[layer2][staker] = staked;
            console.log({ staker, staked });
            await fs.writeFileSync("./data/stakesOfAllUsers.json", JSON.stringify(output));
        }
    }

    await fs.writeFileSync("./data/stakesOfAllUsers.json", JSON.stringify(output));
}

const erc20RecorderMint = async (erc20RecorderAddress) => {
    const [admin] = await ethers.getSigners();
    const erc20Recorder = await ethers.getContractAt("ERC20Recorder", erc20RecorderAddress);

    const layer2s = JSON.parse(await fs.readFileSync("./data/layer2s.json"));
    const stakers = JSON.parse(await fs.readFileSync("./data/stakers.json"));
    const stakesOfAllUsers = JSON.parse(await fs.readFileSync("./data/stakesOfAllUsers.json"));

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

      let totalStakedWei = ethers.utils.formatUnits(totalStaked, 9);
      let end = Math.min(totalStakedWei.indexOf('.'), totalStakedWei.length) ;
      //console.log(totalStakedWei.substring(0,end));
      amounts.push(totalStakedWei.substring(0,end));
      //amounts.push(totalStakedWei);
    }

    if (accounts.length > 0) {
      console.log(accounts.length);
      await (await erc20Recorder.connect(admin).mintBatch(accounts, amounts)).wait();
    }
}
module.exports = { getStakersList, getLayer2List, getTONStakedAmount, erc20RecorderMint }