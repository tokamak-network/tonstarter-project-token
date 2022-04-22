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
    return stakersUnique;
}


const getUpdateStakersList = async (depositManagerAddress, fromBlockNumber, toBlockNumber) => {
  const stakers = [];
  const abiDeposited = [ "event Deposited(address indexed layer2, address depositor, uint256 amount)" ];
  const abiWithdrawalRequested = [ "event WithdrawalRequested(address indexed layer2, address depositor, uint256 amount)" ];
  const abiWithdrawalProcessed = [ "event WithdrawalProcessed(address indexed layer2, address depositor, uint256 amount)" ];

  const topic0Deposited = "Deposited(address,address,uint256)";
  const topic0WithdrawalRequested = "WithdrawalRequested(address,address,uint256)";
  const topic0WithdrawalProcessed = "WithdrawalProcessed(address,address,uint256)";

  let stakersDeposited = await getLogs(depositManagerAddress, fromBlockNumber, toBlockNumber, abiDeposited, topic0Deposited );
  let stakersWithdrawalRequested = await getLogs(depositManagerAddress, fromBlockNumber, toBlockNumber, abiWithdrawalRequested, topic0WithdrawalRequested );
  let stakersWithdrawalProcessed = await getLogs(depositManagerAddress, fromBlockNumber, toBlockNumber, abiWithdrawalProcessed, topic0WithdrawalProcessed );

  // console.log("stakersDeposited: ", stakersDeposited);
  // console.log("stakersWithdrawalRequested: ", stakersWithdrawalRequested);
  // console.log("stakersWithdrawalProcessed: ", stakersWithdrawalProcessed);


  stakersDeposited = stakersDeposited.concat(stakersWithdrawalRequested).concat(stakersWithdrawalProcessed);


  let stakersUnique = stakersDeposited.filter((v, idx, self) => self.indexOf(v) === idx);

  console.log("stakers-update length: ", stakersUnique.length);
  await fs.writeFileSync("./data/stakers-update.json", JSON.stringify(stakersUnique));
  return stakersUnique;
}

const getLogs = async (depositManagerAddress, fromBlockNumber, toBlockNumber, abiEvent, topic0 ) => {
  const stakers = [];
  const iface = new ethers.utils.Interface(abiEvent);

  const filter = {
    address: depositManagerAddress,
    fromBlock: parseInt(fromBlockNumber),
    toBlock: parseInt(toBlockNumber),
    topics: [
      ethers.utils.id(topic0)
    ]
  };

  try{
    const txs = await ethers.provider.getLogs(filter);
    //console.log("length: ", txs.length);

    for (const tx of txs) {
      const { transactionHash } = tx;
      const { logs } = await ethers.provider.getTransactionReceipt(transactionHash);
      const foundLog = logs.find(el => el && el.topics &&
          el.topics.includes(ethers.utils.id(topic0))
        );
      if (!foundLog) continue;
      const parsedlog = iface.parseLog(foundLog);
      let { depositor } = parsedlog["args"];
      depositor = depositor.toLowerCase();
      stakers.push(depositor);
    }
    //console.log({ stakers });
    console.log("stakers length: ", topic0, stakers.length);

  } catch(error){
    console.log('getLogs error',topic0, error);
  }

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


const getUpdateTONStakedAmount = async (seigManagerAddress) => {
  const seigManagerABI = require("../../abi/seigManager.json").abi;
  const seigManager = new ethers.Contract(
      seigManagerAddress,
      seigManagerABI,
      ethers.provider
  );

  const layer2s = JSON.parse(await fs.readFileSync("./data/layer2s.json"));
  const stakers = JSON.parse(await fs.readFileSync("./data/stakers-update.json"));
  const output = JSON.parse(await fs.readFileSync("./data/stakesOfAllUsers-update.json"));

  for (const layer2 of layer2s) {
      for (const staker of stakers) {
          if (!output[layer2])
              output[layer2] = {};
          // if (output[layer2][staker]) {
          //     continue;
          // }

          const staked = (await seigManager.stakeOf(layer2, staker)).toString();
          output[layer2][staker] = staked;
          console.log({ staker, staked });
          await fs.writeFileSync("./data/stakesOfAllUsers-update.json", JSON.stringify(output));
      }
  }

  await fs.writeFileSync("./data/stakesOfAllUsers-update.json", JSON.stringify(output));
}



const concatStakers = async () => {

  const stakers = JSON.parse(await fs.readFileSync("./data/stakers.json"));
  const stakersUpdate = JSON.parse(await fs.readFileSync("./data/stakers-update.json"));
  console.log("stakers length: ", stakers.length);
  console.log("stakersUpdate length: ", stakersUpdate.length);

  let accounts = stakers.concat(stakersUpdate);
  const stakersFinish = accounts.filter((v, idx, self) => self.indexOf(v) === idx);
  console.log("stakersFinish length: ", stakersFinish.length);
  await fs.writeFileSync("./data/stakers-finish.json", JSON.stringify(stakersFinish));
  return stakersFinish;
}

const erc20RecorderMint = async (erc20RecorderAddress) => {
    const [admin] = await ethers.getSigners();
    const erc20Recorder = await ethers.getContractAt("ERC20Recorder", erc20RecorderAddress);

    const layer2s = JSON.parse(await fs.readFileSync("./data/layer2s.json"));
    const stakers = JSON.parse(await fs.readFileSync("./data/stakers-finish.json"));
    const stakesOfAllUsers = JSON.parse(await fs.readFileSync("./data/stakesOfAllUsers-update.json"));

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

const getStakersListOfLayers = async (depositManagerAddress, startBlockNumber, endBlockNumber) => {

  let stakers = [];
  let layer2s = [];
  let stakersOfLayers = {};
  const abi = [ "event Deposited(address indexed layer2, address depositor, uint256 amount)" ];
  const iface = new ethers.utils.Interface(abi);

  console.log(startBlockNumber, endBlockNumber);

 // let startBlock = 10837675;
  // let startBlock = 11817675;
  // let endBlock = 14632601;
  let startBlock = parseInt(startBlockNumber);
  let endBlock = parseInt(endBlockNumber);


  try{

    for(let i = startBlock; i < endBlock; i += 5000) {
      let filter = {
        address: depositManagerAddress,
        fromBlock: i,
        toBlock: i+5000,
        topics: [ethers.utils.id("Deposited(address,address,uint256)")]
      };

      const txs = await ethers.provider.getLogs(filter);
      console.log("length: ", txs.length);

      for (const tx of txs) {
        const { transactionHash } = tx;
        const { logs } = await ethers.provider.getTransactionReceipt(transactionHash);
        const foundLog = logs.find(el => el && el.topics && el.topics.includes(ethers.utils.id("Deposited(address,address,uint256)")));
        if (!foundLog) continue;
        const parsedlog = iface.parseLog(foundLog);
        let { layer2, depositor } = parsedlog["args"];
        //console.log(layer2, depositor)
        depositor = depositor.toLowerCase();
        layer2 = layer2.toLowerCase();

        if(!layer2s.includes(layer2)) layer2s.push(layer2);
        if(!stakersOfLayers[layer2])  stakersOfLayers[layer2] = [];
        if(!stakersOfLayers[layer2].includes(depositor)) stakersOfLayers[layer2].push(depositor);
      }
      console.log("layer2s length: ", i, layer2s.length);
    }

    //console.log({ layer2s });
    console.log("last layer2s length: ", layer2s.length);

  } catch(error){
    console.log('getStakersListOfLayers error',error);
  }

  const layer2sExist = JSON.parse(await fs.readFileSync("./data/layer2s-uniq.json"));
  const stakersOfLayersExist = JSON.parse(await fs.readFileSync("./data/stakersOfLayers.json"));

  let layer2sSum = layer2s.concat(layer2sExist);
  //-----
  const layer2sUnique = layer2sSum.filter((v, idx, self) => self.indexOf(v) === idx);
  console.log("layer2sUnique length: ", layer2sUnique.length);
  await fs.writeFileSync("./data/layer2s-uniq-new.json", JSON.stringify(layer2sUnique));

  let allInfo = {};
  try{
    for(let i=0; i< layer2sUnique.length; i++){
      if(!stakersOfLayers[layer2sUnique[i]])
        continue;

      let out = stakersOfLayers[layer2sUnique[i]];
      if(stakersOfLayersExist[layer2sUnique[i]]) out = out.concat(stakersOfLayersExist[layer2sUnique[i]]);

      const stakersUnique = out.filter((v, idx, self) => self.indexOf(v) === idx);
      console.log("stakersUnique length: ", layer2sUnique[i], stakersUnique.length);

      allInfo[layer2sUnique[i]] = stakersUnique;
    }
  }catch(error){
    console.log('stakersOfLayers error',error);
  }
  await fs.writeFileSync("./data/stakersOfLayers-new.json", JSON.stringify(allInfo));
  return allInfo;
}


const getAutocoinageData = async (seigManagerAddress) => {
  const [admin] = await ethers.getSigners();

  const layer2sUnique = JSON.parse(await fs.readFileSync("./data/layer2s-uniq-new.json"));
  const stakersOfLayers = JSON.parse(await fs.readFileSync("./data/stakersOfLayers-new.json"));

  const autoRefactorCoinageABI = require("../../abi/autoRefactorCoinage.json").abi;
  const seigManagerABI = require("../../abi/seigManager.json").abi;

  const seigManager = new ethers.Contract(
      seigManagerAddress,
      seigManagerABI,
      ethers.provider
  );


  for(let i = 0; i < layer2sUnique.length; i++){
    let layer2Address = layer2sUnique[i];
    let out = {};
    let accountList = [];
    let balanceList = [];
    let refactoredCountList = [];
    let remainList = [];
    let layerTotal = [];
    let layerFactor = [];
    try{
        if(!stakersOfLayers[layer2Address]) return;


        let accounts = stakersOfLayers[layer2Address];
        if(!accounts || accounts.length == 0) return;


        let layer2 = layer2Address;
        let coinage = seigManager.coinages(layer2);
        const autoCoinage = new ethers.Contract(
            coinage,
            autoRefactorCoinageABI,
            ethers.provider
        );

        let factor = await autoCoinage._factor();
        let refactorCount = await autoCoinage.refactorCount();
        //console.log('factor', factor, refactorCount);
        layerFactor.push(factor.toString());
        layerFactor.push(refactorCount.toString());
        console.log('layerFactor', layerFactor);

        out["layerFactor"] = layerFactor;

        let total = await autoCoinage._totalSupply();
        //console.log('total', total);
        layerTotal.push(total.balance.toString());
        layerTotal.push(total.refactoredCount.toString());
        layerTotal.push(total.remain.toString());
        console.log('layerTotal', layerTotal);

        out["layerTotal"] = layerTotal;

        for(let j = 0; j < accounts.length; j++){
            let account = accounts[j];
            let balance = await autoCoinage.balances(account);
            //console.log(account, balance);
            accountList.push(account.toLowerCase());
            balanceList.push(balance.balance.toString());
            refactoredCountList.push(balance.refactoredCount.toString());
            remainList.push(balance.remain.toString())
        }

        console.log('accountList length', accountList.length);
        console.log('balanceList length', balanceList.length);
        console.log('refactoredCountList length', refactoredCountList.length);
        console.log('remainList length', remainList.length);

        out["accounts"] = accountList;
        out["balances"] = balanceList;
        out["refactoredCounts"] = refactoredCountList;
        out["remains"] = remainList;
   // }
    }catch(error){
      console.log('getAutocoinageData error',error);
    }
    console.log(out);
    try{
      await fs.writeFileSync('./data/coin-'+layer2Address+'.json', JSON.stringify(out));
    }catch(error){
      console.log('getAutocoinageData save error',error);
    }
    console.log(i, 'create /data/coin-'+layer2Address+'.json');
  }
}

const syncAutocoinageData = async (autoCoinageSnapshotAddress) => {
  const [admin] = await ethers.getSigners();

  const layer2sUnique = JSON.parse(await fs.readFileSync("./data/layer2s-uniq-new.json"));

  const AutoCoinageSnapshotABI = require("../../abi/AutoCoinageSnapshot.json").abi;


  //for(let i = 0; i < layer2sUnique.length; i++){
  for(let i = 1; i < layer2sUnique.length; i++){
    let layer2Address = layer2sUnique[i];

    const autoCoinageSnapshot = new ethers.Contract(
      autoCoinageSnapshotAddress,
      AutoCoinageSnapshotABI,
      ethers.provider
    );

    const snapshots = JSON.parse(await fs.readFileSync("./data/coin-"+layer2Address+".json"));

    let accounts = snapshots.accounts;
    let balances = snapshots.balances;
    let refactoredCounts = snapshots.refactoredCounts;
    let remains = snapshots.remains;
    let layerTotal = snapshots.layerTotal;
    let layerFactor = snapshots.layerFactor;

    let accountList = [];
    let balanceList = [];
    let refactoredCountList = [];
    let remainList = [];
    let layerTotalList = [];
    let layerFactorList = [];

    try{
        if(!accounts) return;
        if(!balances) return;
        if(!refactoredCounts) return;
        if(!remains) return;
        if(!layerTotal) return;
        if(!layerFactor) return;

        for(let i=0; i< layerTotal.length; i++){
          layerTotalList.push(ethers.BigNumber.from(layerTotal[i]));
        }
        for(let i=0; i< layerFactor.length; i++){
          layerFactorList.push(ethers.BigNumber.from(layerFactor[i]));
        }
        for(let i=0; i< accounts.length; i++){
          accountList.push(accounts[i]);
          balanceList.push(ethers.BigNumber.from(balances[i]));
          refactoredCountList.push(ethers.BigNumber.from(refactoredCounts[i]));
          remainList.push(ethers.BigNumber.from(remains[i]));
        }

        await autoCoinageSnapshot.connect(admin).syncBactchOffline(
          layer2Address,
          accountList,
          balanceList,
          refactoredCountList,
          remainList,
          layerTotalList,
          layerFactorList
        );

        console.log(i, 'syncAutocoinageData end ', layer2Address);

    }catch(error){
      console.log('syncAutocoinageData error',i, layer2Address, error);
    }
  }
}

const getTotalSupplyLayer2 = async (seigManagerAddress, layer2Address) => {
    const [admin] = await ethers.getSigners();

    const autoRefactorCoinageABI = require("../../abi/autoRefactorCoinage.json").abi;
    const seigManagerABI = require("../../abi/seigManager.json").abi;

    const seigManager = new ethers.Contract(
        seigManagerAddress,
        seigManagerABI,
        ethers.provider
    );

    try{
      let coinage = await seigManager.coinages(layer2Address);

      const autoCoinage = new ethers.Contract(
          coinage,
          autoRefactorCoinageABI,
          ethers.provider
      );

      let totalSupply =  await autoCoinage.totalSupply();
      console.log('totalSupply',totalSupply);
    } catch(error){
      console.log('error',error);
    }


}


const getBalanceLayer2Account = async (seigManagerAddress, layer2Address, accountAddress) => {
  const [admin] = await ethers.getSigners();

  const autoRefactorCoinageABI = require("../../abi/autoRefactorCoinage.json").abi;
  const seigManagerABI = require("../../abi/seigManager.json").abi;

  const seigManager = new ethers.Contract(
      seigManagerAddress,
      seigManagerABI,
      ethers.provider
  );

  try{
    let coinage = await seigManager.coinages(layer2Address);

    const autoCoinage = new ethers.Contract(
        coinage,
        autoRefactorCoinageABI,
        ethers.provider
    );

    let totalSupply =  await autoCoinage.totalSupply();
    console.log('totalSupply',totalSupply);

    let balanceOf =  await autoCoinage.balanceOf(accountAddress);
    console.log('balanceOf',balanceOf);

  } catch(error){
    console.log('error',error);
  }


}

module.exports = {
    getUpdateStakersList,
    getStakersList,
    getUpdateTONStakedAmount,
    getLayer2List,
    getTONStakedAmount,
    erc20RecorderMint,
    concatStakers,
    getAutocoinageData,
    getStakersListOfLayers,
    getTotalSupplyLayer2,
    getBalanceLayer2Account,
    syncAutocoinageData
  }