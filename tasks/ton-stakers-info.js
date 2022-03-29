const fs = require('fs');

task("get-layer2-list", "Retrieve and save layer2 list into a file")
    .addParam("layer2RegistryAddress", "Seig Manager Address")
    .setAction(async ({ layer2RegistryAddress }) => {
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
        console.log({ layer2s });
        console.log("length: ", layer2s.length);
        await fs.writeFileSync("./data/layer2s.json", JSON.stringify(layer2s));
    })

task("get-stakers-list", "Retrieve and save layer2 list into a file")
    .addParam("depositManagerAddress", "Seig Manager Address")
    .addParam("blockNumber", "Block Number")
    .setAction(async ({ depositManagerAddress, blockNumber }) => {
        const stakers = [];
        const abi = [ "event Deposited(address indexed layer2, address depositor, uint256 amount)" ];
        const iface = new ethers.utils.Interface(abi);

        const filter = {
          address: depositManagerAddress,
          fromBlock: 0,
          toBlock: parseInt(blockNumber),
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
        console.log({ stakers });
        console.log("length: ", stakers.length);
        const stakersUnique = stakers.filter((v, idx, self) => self.indexOf(v) === idx);
        console.log("length: ", stakersUnique.length);
        await fs.writeFileSync("./data/stakers.json", JSON.stringify(stakersUnique));
    })



task("get-ton-staked-amount", "Retrieve and save accounts and their staked amounts")
    .addParam("seigManagerAddress", "Seig Manager Address")
    .setAction(async ({ seigManagerAddress }) => {
        //const seigManagerABI = JSON.parse(await fs.readFileSync("./abi/seigManager.json")).result;
        const seigManagerABI = require("../abi/seigManager.json").abi;
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
    })

task("erc20-recorder-mint","")
    .addParam("erc20RecorderAddress", "ERC20 Recorder Address")
    .setAction(async function({ erc20RecorderAddress }) {
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
          amounts.push(totalStaked);
        }

        if (accounts.length > 0) {
          console.log(accounts.length);
          console.log(amounts.length);
          await (await erc20Recorder.connect(admin).mintBatch(accounts, amounts)).wait();
        }
    });
