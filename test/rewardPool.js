const { expect } = require("chai");
const { ethers } = require("hardhat");
const Web3EthAbi = require('web3-eth-abi');
const {
  keccak256,
} = require("web3-utils");

let topic0Claimed = ethers.utils.id("Claimed(address,uint256)");
let topic0Withdrawal = ethers.utils.id("Withdrawal(address,uint256)");
let abiClaimed = [ {
          "indexed": true,
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
  ];


describe("RewardPool", function () {
  const MINTER_ROLE = keccak256("MINTER_ROLE");
  const SNAPSHOT_ROLE = keccak256("SNAPSHOT_ROLE");
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

  let tokenA, stakeContract, provider;
  let accounts, admin1, admin2, user1, user2, minter1, minter2 ;

  let mintAmount = ethers.BigNumber.from("1"+"0".repeat(20));
  let tenAmount = ethers.BigNumber.from("1"+"0".repeat(18));
  let zeroBigNumber = ethers.BigNumber.from("0");

  let snapshotIds = [];

  let rewardPools = [
    {
      admin: null,
      contract: null,
      start: null,
      end: null,
      period: 60*60*24*1,
      totalAllocatedReward: ethers.BigNumber.from("1"+"0".repeat(20)),
      rewardPerSecond: null,
      rewardPerStakeAmount: null,
      lastUpdateTime:null,
      totalStakedAmount: null
    },
    {
      admin: null,
      contract: null,
      start: null,
      end: null,
      period: 60*60*24*7,
      totalAllocatedReward: ethers.BigNumber.from("1"+"0".repeat(20)),
      rewardPerSecond: null,
      rewardPerStakeAmount: null,
      lastUpdateTime:null,
      totalStakedAmount: null
    },
    {
      admin: null,
      contract: null,
      start: null,
      end: null,
      period: 60*60*24*30,
      totalAllocatedReward: ethers.BigNumber.from("1"+"0".repeat(20)),
      rewardPerSecond: null,
      rewardPerStakeAmount: null,
      lastUpdateTime:null,
      totalStakedAmount: null
    }
  ]

  let tokens = [
    {
      name: "ProjectA1",
      symbol: "PA1",
      decimals: ethers.BigNumber.from("18"),
      version: "1",
      admin: null,
      minter: null,
      contract: null,
      totalSupply: ethers.BigNumber.from("1"+"0".repeat(24))
    },
    {
      name: "ProjectA2",
      symbol: "PA2",
      decimals: ethers.BigNumber.from("18"),
      version: "1",
      admin: null,
      minter: null,
      contract: null,
      totalSupply: ethers.BigNumber.from("1"+"0".repeat(22))
    },
  ]

  before(async function () {
    accounts = await ethers.getSigners();
    [admin1, admin2, user1, user2, minter1, minter2 ] = accounts
    provider = ethers.provider;

    // let _onERC20Received = Web3EthAbi.encodeFunctionSignature("onERC20Received(address,address,uint256,bytes)") ;
    // console.log('onERC20Received',_onERC20Received)

    // let _onApprove = Web3EthAbi.encodeFunctionSignature("onApprove(address,address,uint256,bytes)") ;
    // console.log('_onApprove',_onApprove)


  });

  it("create Tokens", async function () {
      const ERC20A = await ethers.getContractFactory("ERC20A")

      for(let i=0; i< tokens.length; i++){
        tokens[i].admin = accounts[i];
        tokens[i].contract = await ERC20A.connect(tokens[i].admin).deploy(
          tokens[i].name,
          tokens[i].symbol,
          tokens[i].totalSupply,
          tokens[i].admin.address
          );

        let code = await tokens[i].admin.provider.getCode(tokens[i].contract.address);
        expect(code).to.not.eq("0x");

        expect(await tokens[i].contract.name()).to.be.equal(tokens[i].name);
        expect(await tokens[i].contract.symbol()).to.be.equal(tokens[i].symbol);
        expect(await tokens[i].contract.decimals()).to.be.equal(tokens[i].decimals);
        expect(await tokens[i].contract.totalSupply()).to.be.equal(tokens[i].totalSupply);

        expect(await tokens[i].contract.balanceOf(tokens[i].admin.address)).to.be.equal(tokens[i].totalSupply);
        expect(await tokens[i].contract.balanceOf(tokens[i].admin.address)).to.be.equal(tokens[i].totalSupply);
      }
  });

  it("Create RewardPools", async function () {
      let i=0;
      const RewardPool = await ethers.getContractFactory("RewardPool")

      for(let j=0; j< rewardPools.length; j++){
        rewardPools[j].contract = await RewardPool.connect(tokens[i].admin).deploy(tokens[i].contract.address);
        let code = await tokens[i].admin.provider.getCode(rewardPools[j].contract.address);
        expect(code).to.not.eq("0x");
      }
  });

  it("mint by onlyMinter", async function () {
    let i=0;
      await tokens[i].contract.connect(tokens[i].admin).mint(user1.address, mintAmount);
      expect(await tokens[i].contract.totalSupply()).to.be.equal(tokens[i].totalSupply.add(mintAmount));

      await tokens[i].contract.connect(tokens[i].admin).mint(user2.address, mintAmount);
      expect(await tokens[i].contract.totalSupply()).to.be.equal(tokens[i].totalSupply.add(mintAmount).add(mintAmount));

  });

  it("transfer totalAllocatedReward to RewardPools", async function () {
    let i=0;
    for(let j=0; j< rewardPools.length; j++){
        await tokens[i].contract.connect(tokens[i].admin).transfer(rewardPools[j].contract.address, rewardPools[j].totalAllocatedReward);
        expect(await tokens[i].contract.balanceOf(rewardPools[j].contract.address)).to.be.equal(rewardPools[j].totalAllocatedReward);
    }
  });

  it("SetInit RewardPools", async function () {
      let i=0;

      for(let j=0; j< rewardPools.length; j++){
        rewardPools[j].start = Math.floor(Date.now()/1000) + 10;
        rewardPools[j].end = rewardPools[j].start + rewardPools[j].period;
        await rewardPools[j].contract.connect(tokens[i].admin).setInit(
          rewardPools[j].start, rewardPools[j].end, rewardPools[j].totalAllocatedReward);
      }
  });

  it("pass blocks", async function () {
      ethers.provider.send("evm_increaseTime", [20])
      ethers.provider.send("evm_mine")      // mine the next block
  });

  it("stake using safeTransfer to RewardPools ", async function () {
    let i=0;
    //let j=0;

    for(let j=0; j< rewardPools.length; j++){
      let balanceOfRewardPool = await tokens[i].contract.balanceOf(rewardPools[j].contract.address);

      await tokens[i].contract.connect(user2)['safeTransfer(address,uint256)'](rewardPools[j].contract.address, tenAmount);

      expect(await tokens[i].contract.balanceOf(rewardPools[j].contract.address)).to.be.equal(
        balanceOfRewardPool.add(tenAmount)
        );

      let stakeInfo = await rewardPools[j].contract.stakedInfo(user2.address);

      expect(stakeInfo.amount).to.be.equal(tenAmount);
      expect(stakeInfo.debtReward).to.be.equal(zeroBigNumber);
      expect(stakeInfo.claimedAmount).to.be.equal(zeroBigNumber);
      expect(stakeInfo.lastClaimedTime).to.be.equal(zeroBigNumber);
      expect(stakeInfo.since).to.be.not.equal(zeroBigNumber);
    }

  });

  it("pass time - 1 hour", async function () {
      ethers.provider.send("evm_increaseTime", [60*60*1])
      ethers.provider.send("evm_mine")      // mine the next block
  });

  it("claim ", async function () {
    let i=0;

      for(let j=0; j< rewardPools.length; j++){

        let reward = await rewardPools[j].contract.getRewardAmount(user2.address);
        //console.log('reward',reward.toString());

        let amount = null;
        if(reward.gt(zeroBigNumber) ) {
          let tx = await rewardPools[j].contract.connect(user2).claim();
          const receipt = await tx.wait();

          for (let i = 0; i < receipt.events.length; i++) {
            if (
              receipt.events[i].topics.length > 0 &&
              receipt.events[i].topics[0] == topic0Claimed
            ) {
              const eventObj = Web3EthAbi.decodeLog(
                abiClaimed,
                receipt.events[i].data,
                receipt.events[i].topics.slice(1)
              );

              expect(user2.address).to.be.equal(eventObj.from);
              expect(reward).to.be.lte(ethers.BigNumber.from(eventObj.amount));

            }
          }
        }
      }
  });

  it("pass times - 5 hours", async function () {
      ethers.provider.send("evm_increaseTime", [60*60*5])
      ethers.provider.send("evm_mine")      // mine the next block
  });

  it("APY(Annual Percentage Rate)", async function () {
      let i=0;

      for(let j=0; j< rewardPools.length; j++){

        let reward = await rewardPools[j].contract.getRewardAmount(user2.address);

        let stakeInfo = await rewardPools[j].contract.stakedInfo(user2.address);
        let block = await ethers.provider.getBlock();

        let rewardAmount = stakeInfo.claimedAmount.add(reward);
        let stakedPeriod = block.timestamp - stakeInfo.since.toNumber();

        let apy = (ethers.utils.formatUnits(rewardAmount,18)* (60*60*24*365) / stakedPeriod) / ethers.utils.formatUnits(tenAmount,18)  * 100;
        console.log('APY ',apy ,"%");

      }
  });


  it("pass time - 1 day ", async function () {
      ethers.provider.send("evm_increaseTime", [60*60*24])
      ethers.provider.send("evm_mine")      // mine the next block
  });

  it("claim ", async function () {
    let i=0;

      for(let j=0; j< rewardPools.length; j++){

        let reward = await rewardPools[j].contract.getRewardAmount(user2.address);
        //console.log('reward',reward.toString());

        let amount = null;
        if(reward.gt(zeroBigNumber) ) {
          let tx = await rewardPools[j].contract.connect(user2).claim();
          const receipt = await tx.wait();

          for (let i = 0; i < receipt.events.length; i++) {
            if (
              receipt.events[i].topics.length > 0 &&
              receipt.events[i].topics[0] == topic0Claimed
            ) {
              const eventObj = Web3EthAbi.decodeLog(
                abiClaimed,
                receipt.events[i].data,
                receipt.events[i].topics.slice(1)
              );

              expect(user2.address).to.be.equal(eventObj.from);
              expect(reward).to.be.lte(ethers.BigNumber.from(eventObj.amount));
              ///console.log('eventObj.amount',eventObj.amount);

            }
          }
        }
      }
  });


  it("APY(Annual Percentage Rate)", async function () {
      let i=0;

      for(let j=0; j< rewardPools.length; j++){

        let reward = await rewardPools[j].contract.getRewardAmount(user2.address);

        let stakeInfo = await rewardPools[j].contract.stakedInfo(user2.address);

        let block = await ethers.provider.getBlock();

        let rewardAmount = stakeInfo.claimedAmount.add(reward);
        let stakedPeriod = block.timestamp - stakeInfo.since.toNumber();

        let apy = (ethers.utils.formatUnits(rewardAmount,18)* (60*60*24*365) / stakedPeriod) / ethers.utils.formatUnits(tenAmount,18)  * 100;
        console.log('APY ',apy ,"%");

      }
  });


  it("pass time - 1 day ", async function () {
      ethers.provider.send("evm_increaseTime", [60*60*24])
      ethers.provider.send("evm_mine")      // mine the next block
  });

  it("claim ", async function () {
    let i=0;

      for(let j=0; j< rewardPools.length; j++){

        let reward = await rewardPools[j].contract.getRewardAmount(user2.address);
        //console.log('reward',reward.toString());

        let amount = null;
        if(reward.gt(zeroBigNumber) ) {
          let tx = await rewardPools[j].contract.connect(user2).claim();
          const receipt = await tx.wait();

          for (let i = 0; i < receipt.events.length; i++) {
            if (
              receipt.events[i].topics.length > 0 &&
              receipt.events[i].topics[0] == topic0Claimed
            ) {
              const eventObj = Web3EthAbi.decodeLog(
                abiClaimed,
                receipt.events[i].data,
                receipt.events[i].topics.slice(1)
              );

              expect(user2.address).to.be.equal(eventObj.from);
              expect(reward).to.be.lte(ethers.BigNumber.from(eventObj.amount));
              ///console.log('eventObj.amount',eventObj.amount);

            }
          }
        }
      }
  });

  it("withdraw ", async function () {
    let i=0;

      for(let j=0; j< rewardPools.length; j++){

        let balanceOfContract = await tokens[i].contract.balanceOf(rewardPools[j].contract.address);
        let stakeInfo = await rewardPools[j].contract.stakedInfo(user2.address);
        expect(balanceOfContract).to.be.gte(stakeInfo.amount);


        let tx = await rewardPools[j].contract.connect(user2).withdraw();
        const receipt = await tx.wait();

        for (let i = 0; i < receipt.events.length; i++) {
          if (
            receipt.events[i].topics.length > 0 &&
            receipt.events[i].topics[0] == topic0Withdrawal
          ) {
            const eventObj = Web3EthAbi.decodeLog(
              abiClaimed,
              receipt.events[i].data,
              receipt.events[i].topics.slice(1)
            );

            expect(user2.address).to.be.equal(eventObj.from);
            expect(stakeInfo.amount).to.be.lte(ethers.BigNumber.from(eventObj.amount));

          }
        }
      }
  });

});
