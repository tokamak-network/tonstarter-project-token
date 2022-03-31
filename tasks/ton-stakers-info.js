const fs = require('fs');
const {
  getStakersList,
  getLayer2List,
  getTONStakedAmount,
  erc20RecorderMint
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
