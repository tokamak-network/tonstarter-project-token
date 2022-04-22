const hre = require("hardhat");
require('dotenv').config()
const {
  keccak256,
} = require("web3-utils");

const AutoCoinageSnapshotABI  = require("../../abi/AutoCoinageSnapshot.json");
const TONABI  = require("../../abi/TON.json");
const DepositManagerABI  = require("../../abi/DepositManager.json");
const DaoCommitteeABI  = require("../../abi/daoCommittee.json");
const CandidateABI  = require("../../abi/Candidate.json");

let deployedAddress="0x605F8Ace904568E53DE2D217E019C9212991C22f";
let layer2Address = "0x1fa621d238f30f6651ddc8bd5f4be21c6b894426";
let SeigManagerAddress = "0x957DaC3D3C4B82088A4939BE9A8063e20cB2efBE";
let Layer2RegistryAddress = "0xA609Cb2b9b0A4845077D2C965B7C6DFE5F59c847";
let TONAddress = "0x44d4F5d89E9296337b8c48a332B3b2fb2C190CD0";
let WTONAddress = "0x709bef48982Bbfd6F2D4Be24660832665F53406C";
let DepositManagerAddress = "0x57F5CD759A5652A697D539F1D9333ba38C615FC2";

let layer2s = ["0x1fa621d238f30f6651ddc8bd5f4be21c6b894426","0xfb1d0bc7534b727b22b09f190cc1319eeee9ea8c","0x9b21a62f2ca94472f3708ca08e221f6440fa2104","0xf742edddf1e032e3a0ca07fda7fbb6467f6e13a1","0x878bdc5a032af1d0004e588f85b206754855b069","0x92119dda3451c98b31cb4101e8a00f3029228726","0xc313f1ef54d22964a7d5567bde67785cd11d51f8","0xd30cedd7b0d88f29320b1ca3d038f324e490a6db","0x2358bd866eabfbd06269e6a38eb434d7a9c63ebe","0xe538bc53e219b1bdf6ce03ad799c3d5ae675d737","0x0d0f7116f4107f6fa138e40003cf46f254d18966","0x4837b6b1af333f99afe2fb4e2ee94fb2c7671963","0x3d0289555805927289f2965233cbcfda350c6a97","0x2e8f7a67993bc38916631788af3fe53b27d4b6b2","0x7a9322d78e37a09d0afa5c66e5910965d6faa161","0x86395793570361d8bbc1f171b6e6219e79df132c","0x2229c036d929529ae2755c98f0a73c29f5439bbb","0xe3728888040c19e74cb6eae8942b2e0f342368eb","0x9f96a9958db34e276f2fc9291bcdde14189b029c","0x79a43cc28af9250d368aeb4e86c978006789dc86","0x75ba451ade3639120b6670dc51fe376fd909635f","0xf4bef71295f398fea182458b772aeaf229c9fe0d","0x56cd729002de3b77e56842e8be9cdb10bce4731f","0xb5480efa399aa6b8092f08f264dce6e8e3148a32","0x0878b8f14ddcbd7c704a34dda81bd9c3427f30c7","0x8392b59eb9828ac7ea0ce416d5695d54f80cb704","0xa8b5f067bb2237462d995d14a2a500fc3ec72760","0x112c2eebc3cf7437d3536afd3cf33046485eccfd","0x1a4959e95b7f78d79332239a6d6af37b031acdbc","0x3a89908a817594fda73a36fee579d3c8565139da","0x4b2ca992ace7d770d9f9a0c3eeec9711059be474","0x22b43e5a5e2c143e97043664a3d3070d43128b7e","0xff3eef4b7280cd5dff581681f2983d442278a0da","0x7e2aaf1f9a6fbcb2e4e7ec98812b1e0ee2469c15"]


describe("AutoCoinageSnapshot - test2", function () {

  let accounts, admin, user1, user2;
  let autoCoinageSnapshot , TON , DepositManager ;

  let check_snapshotIds =[];
  let totalSupplys =[];
  let balanceOfs = [];
  let snapshotAggregatorIds =[];
  before(async function () {
    const signers = await hre.ethers.getSigners();

    admin = signers[0];
    user1 = signers[1];
    user2 = signers[2];

    await hre.ethers.provider.send("hardhat_setBalance", [
      user1.address,
      "0x56BC75E2D63100000",
    ]);

    accounts = [admin.address, user1.address, user2.address];
    autoCoinageSnapshot = await hre.ethers.getContractAt(AutoCoinageSnapshotABI.abi, deployedAddress, hre.ethers.provider);
    TON  = await hre.ethers.getContractAt(TONABI.abi, TONAddress, hre.ethers.provider);
    DepositManager  = await hre.ethers.getContractAt(DepositManagerABI.abi, DepositManagerAddress, hre.ethers.provider);

  });


  it("1. 현재 상태 동기화 ", async function () {
    for(let i = 0; i < layer2s.length; i++){
      await autoCoinageSnapshot.connect(admin).syncBatch(layer2s[i], accounts);
    }
    await checkList(autoCoinageSnapshot, layer2Address, accounts)
  });

  it("2. 스냅샷 어그리게이터  ", async function () {

    await autoCoinageSnapshot.snapshot();
    let id =  await autoCoinageSnapshot.snashotAggregatorTotal();
    let totalSupply =  await autoCoinageSnapshot["totalSupply()"]();
    let balanceOf =  await autoCoinageSnapshot["balanceOf(address)"](admin.address);

    snapshotAggregatorIds.push(id);
    totalSupplys.push(totalSupply);
    balanceOfs.push(balanceOf);
  });


  it("3. staking ", async function () {
    const tonAmount =  ethers.utils.parseUnits("100", "ether");
    const param = web3.eth.abi.encodeParameters(
      ["address", "address"],
      [DepositManagerAddress, layer2s[0]]
    );
    await TON.connect(admin).approveAndCall(WTONAddress, tonAmount, param);
    await autoCoinageSnapshot.connect(admin).syncBatch(layer2s[0], [admin.address]);
    await checkList(autoCoinageSnapshot, layer2Address, accounts)

  });

  it("4. 스냅샷 어그리게이터  ", async function () {

    await autoCoinageSnapshot.snapshot();
    let id =  await autoCoinageSnapshot.snashotAggregatorTotal();
    let totalSupply =  await autoCoinageSnapshot["totalSupply()"]();
    let balanceOf =  await autoCoinageSnapshot["balanceOf(address)"](admin.address);

    snapshotAggregatorIds.push(id);
    totalSupplys.push(totalSupply);
    balanceOfs.push(balanceOf);
  });



  it("5. 스냅샷 어그리게이터로 조회 ", async function () {

    expect(snapshotAggregatorIds.length).to.be.gt(0);

    for(let i=0; i< snapshotAggregatorIds.length; i++){

      let totalSupply =  await autoCoinageSnapshot["totalSupplyAt(uint256)"](snapshotAggregatorIds[i]);
      let balanceOf =  await autoCoinageSnapshot["balanceOfAt(address,uint256)"](snapshotAggregatorIds[i], admin.address);

      expect(totalSupplys[i]).to.be.eq(totalSupply);
      expect(balanceOfs[i]).to.be.eq(balanceOf);
    }
  });


});

async function checkList(autoCoinageSnapshot, layer2Address, accounts){

  // 1-1. 사용자의 의 스냅정보와 현재 토카막정보가 같은지 확인한다.
  for(let i=0; i< accounts.length; i++){
    await checkSyncAccountInLayer2(autoCoinageSnapshot, layer2Address, accounts[i])
  }

  // 2-2. 레이어의 양 정보가 스냅정보와 현재 토카막 정보가 같은지 확인한다.
  await checkSyncLayer2(autoCoinageSnapshot, layer2Address)

  // 2-3. 팩터 스냅정보와 현재 토카막 정보가 같은지 확인한다.
  await checkSyncFactor(autoCoinageSnapshot, layer2Address)


  // 2-3. 사용자의 밸런스가 현재 토카막의 정보와 같은지 확인한다.
  for(let i=0; i< accounts.length; i++){
    await checkSyncBalanceOf(autoCoinageSnapshot, accounts[i])
  }

  // 2-4. 전체 스테이킹 금액이 현재 토카막의 정보와 같은지 확인한다.
  await checkSyncTotalAmount(autoCoinageSnapshot)

}

async function checkSyncAccountInLayer2(autoCoinageSnapshot, layer2, account){

    let adminInfo =  await autoCoinageSnapshot.currentAccountBalanceSnapshots(layer2, account);
    // console.log("checkSyncAccountInLayer2 layer2:", layer2, "account:",account );
    // console.log(adminInfo.snapshotted );
    // console.log( adminInfo.snapShotBalance, adminInfo.curBalances );
    // console.log( adminInfo.snapShotRefactoredCount, adminInfo.curRefactoredCounts );
    // console.log( adminInfo.snapShotRemain, adminInfo.curRemains );
    if(adminInfo.snapshotted){
      if( adminInfo.snapShotBalance.toString() != adminInfo.curBalances.toString() ) {
        console.log("snapShotBalance not sync");
      }
      if( adminInfo.snapShotRefactoredCount.toString() != adminInfo.curRefactoredCounts.toString() ) console.log("snapShotRefactoredCount not sync");
      if( adminInfo.snapShotRemain.toString() != adminInfo.curRemains.toString() ) console.log("snapShotRemain not sync");
    } else {
      console.log("not snapshotted " );
    }
}

async function checkSyncLayer2(autoCoinageSnapshot, layer2){


    let adminInfo =  await autoCoinageSnapshot.currentTotalSupplySnapshots(layer2);
    // console.log("checkSyncLayer2 layer2:", layer2);
    if(adminInfo.snapshotted){
      if( adminInfo.snapShotBalance.toString() != adminInfo.curBalances.toString() ) console.log("snapShotBalance not sync");
      if( adminInfo.snapShotRefactoredCount.toString() != adminInfo.curRefactoredCounts.toString() ) console.log("snapShotRefactoredCount not sync");
      if( adminInfo.snapShotRemain.toString() != adminInfo.curRemains.toString() ) console.log("snapShotRemain not sync");
    } else {
      console.log("not snapshotted " );
    }
}


async function checkSyncFactor(autoCoinageSnapshot, layer2){

    let adminInfo =  await autoCoinageSnapshot.currentFactorSnapshots(layer2);

    if(adminInfo.snapshotted){
      if( adminInfo.snapShotFactor.toString() != adminInfo.curFactor.toString() ) console.log("snapShotFactor not sync");
      if( adminInfo.snapShotRefactorCount.toString() != adminInfo.curRefactorCount.toString() ) console.log("snapShotRefactorCount not sync");

    } else {
      console.log("not snapshotted " );
    }
}

async function checkSyncBalanceOf(autoCoinageSnapshot, account){

    let amount =  await autoCoinageSnapshot["balanceOf(address)"](account);
    let amountTokamak =  await autoCoinageSnapshot["getBalanceOfInTokamak(address)"](account);

    if( amount.toString() != amountTokamak.toString() ) console.log("balanceOf not sync");
}

async function checkSyncTotalAmount(autoCoinageSnapshot){

  let total =  await autoCoinageSnapshot["totalSupply()"]();
  let amountTokamak =  await autoCoinageSnapshot["getTotalStakedInTokamak()"]();
  if( total.toString() != amountTokamak.toString() ) console.log("totalSupply not sync");
}
