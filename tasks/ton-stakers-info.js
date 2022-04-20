const fs = require('fs');
const {
  getUpdateTONStakedAmount,
  getUpdateStakersList,
  getStakersList,
  getLayer2List,
  getTONStakedAmount,
  erc20RecorderMint,
  concatStakers
} = require("../test/helpers/ton-stakers");

task("get-layer2-list", "Retrieve and save layer2 list into a file")
    .addParam("layer2RegistryAddress", "Seig Manager Address")
    .setAction(async ({ layer2RegistryAddress }) => {
      await getLayer2List(layer2RegistryAddress);
    })

task("get-stakers-list", "Retrieve and save layer2 list into a file")
    .addParam("depositManagerAddress", "Seig Manager Address")
    .addParam("blockNumber", "Block Number")
    .setAction(async ({ depositManagerAddress, blockNumber }) => {
      await getStakersList(depositManagerAddress, blockNumber);
    })

task("get-ton-staked-amount", "Retrieve and save accounts and their staked amounts")
    .addParam("seigManagerAddress", "Seig Manager Address")
    .setAction(async ({ seigManagerAddress }) => {
      await getTONStakedAmount(seigManagerAddress);
    })


task("get-update-stakers-list", "Retrieve and save layer2 list into a file")
  .addParam("depositManagerAddress", "Seig Manager Address")
  .addParam("fromBlockNumber", "Block Number")
  .addParam("toBlockNumber", "Block Number")
  .setAction(async ({ depositManagerAddress, fromBlockNumber, toBlockNumber }) => {
    await getUpdateStakersList(depositManagerAddress, fromBlockNumber, toBlockNumber);
  })

task("get-update-ton-staked-amount", "Retrieve and save layer2 list into a file")
  .addParam("seigManagerAddress", "Seig Manager Address")
  .setAction(async ({ seigManagerAddress }) => {
    await getUpdateTONStakedAmount(seigManagerAddress);
  })


task("concat-stakers","")
.setAction(async ({}) => {
  await concatStakers();
});

task("erc20-recorder-mint","")
    .addParam("erc20RecorderAddress", "ERC20 Recorder Address")
    .setAction(async ({ erc20RecorderAddress }) => {
      await erc20RecorderMint(erc20RecorderAddress);
    });

task("update-seig", "")
    .setAction(async () => {
      await network.provider.request({
          method: "hardhat_reset",
          params: [
            {
              forking: {
                jsonRpcUrl: "https://mainnet.infura.io/v3/27113ffbad864e8ba47c7d993a738a10",
                blockNumber: 14215307,
              },
            },
          ],
      });

      const impersonate = async (account) => {
        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [account],
        });
        await network.provider.send("hardhat_setBalance", [
            account,
            "0x10000000000000000000000000",
        ]);
        return ethers.getSigner(account);
      }

      const seigManagerAddress = "0x710936500aC59e8551331871Cbad3D33d5e0D909";
      const seigManagerABI = require("../abi/seigManager.json").abi;
      const seigManager = new ethers.Contract(
          seigManagerAddress,
          seigManagerABI,
          ethers.provider
      );

      const coinageAddress = "0x39A13a796A3Cd9f480C28259230D2EF0a7026033";
      const coinage = await impersonate(coinageAddress);
      const receipt = await (await seigManager.connect(coinage).updateSeigniorage()).wait();
    })



task("display-ton-staked-amount", "Retrieve and save accounts and their staked amounts")
  .addParam("seigManagerAddress", "Seig Manager Address")
  .addParam("accountAddress", "")
  .setAction(async ({ seigManagerAddress, accountAddress }) => {


    const seigManagerABI = JSON.parse(await fs.readFileSync("./abi/seigManager.json")).abi;
    const seigManager = new ethers.Contract(
        seigManagerAddress,
        seigManagerABI,
        ethers.provider
    );

    const layer2s = JSON.parse(await fs.readFileSync("./data/layer2s.json"));
    const stakers = JSON.parse(await fs.readFileSync("./data/stakers.json"));
    const output = JSON.parse(await fs.readFileSync("./data/stakesOfAllUsers.json"));
    let totalStaked = ethers.BigNumber.from(0);

    for (const layer2 of layer2s) {
        let staker = accountAddress;
        //for (const staker of stakers) {
            //console.log(layer2, staker, output[layer2][staker]);

            if (!output[layer2])
                output[layer2] = {};

            const staked = (await seigManager.stakeOf(layer2, staker)).toString();
            if (staked) {
              totalStaked = totalStaked.add(ethers.BigNumber.from(staked));
            }
            console.log(layer2, staker, staked, totalStaked);
       // }
    }

    console.log(totalStaked);

    let totalStakedWei = ethers.utils.formatUnits(totalStaked, 9);
    console.log(totalStakedWei);
    let end = Math.min(totalStakedWei.indexOf('.'), totalStakedWei.length) ;
    console.log(totalStakedWei.substring(0,end));

  })


  task("display-update-ton-staked-amount", "Retrieve and save accounts and their staked amounts")
  .addParam("seigManagerAddress", "Seig Manager Address")
  .addParam("accountAddress", "")
  .setAction(async ({ seigManagerAddress, accountAddress }) => {


    const seigManagerABI = JSON.parse(await fs.readFileSync("./abi/seigManager.json")).abi;
    const seigManager = new ethers.Contract(
        seigManagerAddress,
        seigManagerABI,
        ethers.provider
    );

    const layer2s = JSON.parse(await fs.readFileSync("./data/layer2s.json"));
    const stakers = JSON.parse(await fs.readFileSync("./data/stakers.json"));
    const output = JSON.parse(await fs.readFileSync("./data/stakesOfAllUsers-update.json"));
    let totalStaked = ethers.BigNumber.from(0);

    for (const layer2 of layer2s) {
        let staker = accountAddress;
        //for (const staker of stakers) {
            //console.log(layer2, staker, output[layer2][staker]);

            if (!output[layer2])
                output[layer2] = {};

            const staked = (await seigManager.stakeOf(layer2, staker)).toString();
            if (staked) {
              totalStaked = totalStaked.add(ethers.BigNumber.from(staked));
            }
            console.log(layer2, staker, staked, totalStaked);
       // }
    }

    console.log(totalStaked);

    let totalStakedWei = ethers.utils.formatUnits(totalStaked, 9);
    console.log(totalStakedWei);
    let end = Math.min(totalStakedWei.indexOf('.'), totalStakedWei.length) ;
    console.log(totalStakedWei.substring(0,end));

  })


  task("review-ton-staked-amount", "Retrieve and save accounts and their staked amounts")
  .addParam("seigManagerAddress", "Seig Manager Address")
  .addParam("accountAddress", "")
  .setAction(async ({ seigManagerAddress, accountAddress }) => {


    const seigManagerABI = JSON.parse(await fs.readFileSync("./abi/seigManager.json")).abi;
    const seigManager = new ethers.Contract(
        seigManagerAddress,
        seigManagerABI,
        ethers.provider
    );

    const layer2s = JSON.parse(await fs.readFileSync("./data/layer2s.json"));
    const stakers = JSON.parse(await fs.readFileSync("./data/stakers.json"));
    const output = JSON.parse(await fs.readFileSync("./data/stakesOfAllUsers.json"));

    let totalStaked = ethers.BigNumber.from(0);

    for (const layer2 of layer2s) {
        let staker = accountAddress;

        if (!output[layer2])
            output[layer2] = {};
        // if (output[layer2][staker]) {
        //     continue;
        // }

        const staked = output[layer2][staker];
        if (staked) {
          totalStaked = totalStaked.add(ethers.BigNumber.from(staked));
        }
        console.log(layer2, staker, staked, totalStaked);

    }

    console.log(totalStaked);

    let totalStakedWei = ethers.utils.formatUnits(totalStaked, 9);
    console.log(totalStakedWei);
    let end = Math.min(totalStakedWei.indexOf('.'), totalStakedWei.length) ;
    console.log(totalStakedWei.substring(0,end));

  })


  task("review-update-ton-staked-amount", "Retrieve and save accounts and their staked amounts")
  .addParam("seigManagerAddress", "Seig Manager Address")
  .addParam("accountAddress", "")
  .setAction(async ({ seigManagerAddress, accountAddress }) => {


    const seigManagerABI = JSON.parse(await fs.readFileSync("./abi/seigManager.json")).abi;
    const seigManager = new ethers.Contract(
        seigManagerAddress,
        seigManagerABI,
        ethers.provider
    );

    const layer2s = JSON.parse(await fs.readFileSync("./data/layer2s.json"));
    const stakers = JSON.parse(await fs.readFileSync("./data/stakers.json"));
    const output = JSON.parse(await fs.readFileSync("./data/stakesOfAllUsers-update.json"));

    let totalStaked = ethers.BigNumber.from(0);

    for (const layer2 of layer2s) {
        let staker = accountAddress;

        if (!output[layer2])
            output[layer2] = {};
        // if (output[layer2][staker]) {
        //     continue;
        // }

        const staked = output[layer2][staker];
        if (staked) {
          totalStaked = totalStaked.add(ethers.BigNumber.from(staked));
        }
        console.log(layer2, staker, staked, totalStaked);

    }

    console.log(totalStaked);

    let totalStakedWei = ethers.utils.formatUnits(totalStaked, 9);
    console.log(totalStakedWei);
    let end = Math.min(totalStakedWei.indexOf('.'), totalStakedWei.length) ;
    console.log(totalStakedWei.substring(0,end));

  })
