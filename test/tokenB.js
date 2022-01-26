const { expect } = require("chai");
const { ethers } = require("hardhat");
const Web3EthAbi = require('web3-eth-abi');
const {
  keccak256,
} = require("web3-utils");

describe("ERC20TokenB", function () {
  const MINTER_ROLE = keccak256("MINTER_ROLE");
  const SNAPSHOT_ROLE = keccak256("SNAPSHOT_ROLE");
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

  let tokenA, stakeContract, provider;
  let accounts, admin1, admin2, user1, user2, minter1, minter2 ;

  let mintAmount = ethers.BigNumber.from("1"+"0".repeat(20));
  let zeroBigNumber = ethers.BigNumber.from("0");

  let snapshotIds = [];

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
      const ERC20A = await ethers.getContractFactory("ERC20B")

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

  it("stakeContract", async function () {
      let i=0;
      const SimpleStake = await ethers.getContractFactory("SimpleStake")
      stakeContract = await SimpleStake.connect(tokens[i].admin).deploy(tokens[i].contract.address);
      let code = await tokens[i].admin.provider.getCode(stakeContract.address);
      expect(code).to.not.eq("0x");
  });

  it("mint by onlyMinter", async function () {
    let i=0;
      await tokens[i].contract.connect(tokens[i].admin).mint(user1.address, mintAmount);
      expect(await tokens[i].contract.totalSupply()).to.be.equal(tokens[i].totalSupply.add(mintAmount));
  });

  it("mint fail by non-Minter", async function () {
    let i=0;
     await expect(tokens[i].contract.connect(user1).mint(user1.address, mintAmount)).to.be.revertedWith("");
  });

  it("burn", async function () {
    let i=0;
      await tokens[i].contract.connect(user1).burn(mintAmount);
      expect(await tokens[i].contract.totalSupply()).to.be.equal(tokens[i].totalSupply);
  });

  it("transfer", async function () {
    let i=0;
    await tokens[i].contract.connect(tokens[i].admin).transfer(user1.address, mintAmount);
    expect(await tokens[i].contract.totalSupply()).to.be.equal(tokens[i].totalSupply);

    await tokens[i].contract.connect(tokens[i].admin).transfer(user2.address, mintAmount);
    expect(await tokens[i].contract.totalSupply()).to.be.equal(tokens[i].totalSupply);
  });

  it("transfer to stakeContract ", async function () {
    let i=0;
    await tokens[i].contract.connect(user1).transfer(stakeContract.address, mintAmount);

    expect(await tokens[i].contract.balanceOf(stakeContract.address)).to.be.equal(mintAmount);
    expect(await stakeContract.stakeAmounts(user1.address)).to.be.equal(zeroBigNumber);
  });

  it("stake using safeTransfer to stakeContract ", async function () {
    let i=0;

    await tokens[i].contract.connect(user2)['safeTransfer(address,uint256)'](stakeContract.address, mintAmount);
    expect(await tokens[i].contract.balanceOf(stakeContract.address)).to.be.equal(mintAmount.add(mintAmount));
    expect(await stakeContract.stakeAmounts(user2.address)).to.be.equal(mintAmount);
  });


  it("claim ( stakeContract ) ", async function () {
    let i=0;
    await stakeContract.connect(tokens[i].admin).claim(mintAmount);
    expect(await tokens[i].contract.balanceOf(stakeContract.address)).to.be.equal(mintAmount);

    await tokens[i].contract.connect(tokens[i].admin).transfer(user1.address, mintAmount);
  });


  it("withdraw ( stakeContract ) ", async function () {
    let i=0;

    expect(await tokens[i].contract.balanceOf(user2.address)).to.be.equal(zeroBigNumber);
    await stakeContract.connect(user2).withdraw();
    expect(await tokens[i].contract.balanceOf(user2.address)).to.be.equal(mintAmount);
  });

  it("approve ", async function () {
    let i=0;

    expect(await tokens[i].contract.balanceOf(stakeContract.address)).to.be.equal(zeroBigNumber);
    let allowance = await tokens[i].contract.allowance(user2.address, stakeContract.address) ;

    if(allowance < mintAmount) {
      await tokens[i].contract.connect(user2).approve(stakeContract.address, mintAmount);
    }

    allowance = await tokens[i].contract.allowance(user2.address, stakeContract.address) ;

    await stakeContract.connect(user2).stake(mintAmount);

    expect(await tokens[i].contract.balanceOf(stakeContract.address)).to.be.equal(mintAmount);
    expect(await stakeContract.stakeAmounts(user2.address)).to.be.equal(mintAmount);

    await stakeContract.connect(user2).withdraw();
    expect(await tokens[i].contract.balanceOf(user2.address)).to.be.equal(mintAmount);
  });

  it("approveAndCall ", async function () {
    let i=0;

    expect(await tokens[i].contract.balanceOf(user1.address)).to.be.equal(mintAmount);
    let stakeBalance = await tokens[i].contract.balanceOf(stakeContract.address);
    let data = null;
    let typesArray= ["address","uint256"];
    let parameters = [stakeContract.address, mintAmount];
    data = Web3EthAbi.encodeParameters(typesArray, parameters);

    await tokens[i].contract.connect(user1).approveAndCall(stakeContract.address, mintAmount, data);
    expect(await tokens[i].contract.balanceOf(user1.address)).to.be.equal(zeroBigNumber);
    expect(await tokens[i].contract.balanceOf(stakeContract.address)).to.be.equal(stakeBalance.add(mintAmount));
    expect(await stakeContract.stakeAmounts(user1.address)).to.be.equal(mintAmount);

    await stakeContract.connect(user1).withdraw();
    expect(await tokens[i].contract.balanceOf(user1.address)).to.be.equal(mintAmount);
  });

  it("snapshot by SNAPSHOT_ROLE ", async function () {
    let i=0;
    let balanceOfUser1 = await tokens[i].contract.balanceOf(user1.address);
    let balanceOfUser2 = await tokens[i].contract.balanceOf(user2.address);
    let balanceOfTotalSupply = await tokens[i].contract.totalSupply();
    let initialId = await tokens[i].contract.currentSnapshotId();

    expect(await tokens[i].contract.hasRole(SNAPSHOT_ROLE, tokens[i].admin.address)).to.be.equal(true);

    await tokens[i].contract.connect(tokens[i].admin).snapshot();
    let currentSnapshotId = await tokens[i].contract.currentSnapshotId();

    expect(currentSnapshotId).to.be.equal(initialId.add(ethers.BigNumber.from("1")));

    await tokens[i].contract.connect(tokens[i].admin).mint(user1.address, mintAmount);
    expect(await tokens[i].contract.balanceOfAt(user1.address, currentSnapshotId)).to.be.equal(balanceOfUser1);
    expect(await tokens[i].contract.balanceOfAt(user2.address, currentSnapshotId)).to.be.equal(balanceOfUser2);
    expect(await tokens[i].contract.totalSupplyAt(currentSnapshotId)).to.be.equal(balanceOfTotalSupply);

    expect(await tokens[i].contract.balanceOf(user1.address)).to.be.equal(balanceOfUser1.add(mintAmount));
    expect(await tokens[i].contract.totalSupply()).to.be.equal(balanceOfTotalSupply.add(mintAmount));
  });

  it("snapshot fail by Someone ", async function () {
    let i=0;

    let initialId = await tokens[i].contract.currentSnapshotId();

    expect(await tokens[i].contract.hasRole(SNAPSHOT_ROLE, user2.address)).to.be.equal(false);

    await expect(tokens[i].contract.connect(user2).snapshot()).to.be.revertedWith("");

  });


  it("grant SNAPSHOT_ROLE by hasSnapshotRole", async function () {
    let i=0;

    let initialId = await tokens[i].contract.currentSnapshotId();


    expect(await tokens[i].contract.hasRole(SNAPSHOT_ROLE, tokens[i].admin.address)).to.be.equal(true);
    expect(await tokens[i].contract.hasRole(SNAPSHOT_ROLE, user2.address)).to.be.equal(false);


    await  tokens[i].contract.connect(tokens[i].admin).grantRole(SNAPSHOT_ROLE, user2.address);

    expect(await tokens[i].contract.hasRole(MINTER_ROLE, user2.address)).to.be.equal(false);
    expect(await tokens[i].contract.hasRole(SNAPSHOT_ROLE, user2.address)).to.be.equal(true);
    await tokens[i].contract.connect(user2).snapshot();
  });


  it("grant DEFAULT_ADMIN_ROLE by hasDEFAULT_ADMIN_ROLE", async function () {
     let i=0;
     expect(await tokens[i].contract.hasRole(DEFAULT_ADMIN_ROLE, tokens[i].admin.address)).to.be.equal(true);
     expect(await tokens[i].contract.hasRole(DEFAULT_ADMIN_ROLE, user2.address)).to.be.equal(false);
     await  tokens[i].contract.connect(tokens[i].admin).grantRole(DEFAULT_ADMIN_ROLE, user2.address);

    expect(await tokens[i].contract.hasRole(DEFAULT_ADMIN_ROLE, user2.address)).to.be.equal(true);
    await  tokens[i].contract.connect(user2).grantRole(SNAPSHOT_ROLE, user1.address);
    expect(await tokens[i].contract.hasRole(SNAPSHOT_ROLE, user1.address)).to.be.equal(true);
    await tokens[i].contract.connect(user1).snapshot();
  });

});
