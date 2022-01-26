const { expect } = require("chai");
const { ethers } = require("hardhat");

const {
  keccak256,
} = require("web3-utils");

describe("TokenAFactory", function() {
  const MINTER_ROLE = keccak256("MINTER_ROLE");
  const SNAPSHOT_ROLE = keccak256("SNAPSHOT_ROLE");

  let tokenA, factory, provider;
  let deployer, user1, person1, person2, person3, person4,person5, person6 ;

  let tokenContracts = [
      {
       name : "Test1",
       symbol : "TT1",
       initialSupply : ethers.BigNumber.from("1"+"0".repeat(24)),
       decimals: ethers.BigNumber.from("18"),
       owner : null,
       contractAddress: null,
       index : null
      },
      {
       name : "Test2",
       symbol : "TT2",
       initialSupply : ethers.BigNumber.from("1"+"0".repeat(20)),
       decimals: ethers.BigNumber.from("18"),
       owner : null,
       contractAddress: null,
       index : null
      },
      {
       name : "Test3",
       symbol : "TT3",
       initialSupply : ethers.BigNumber.from("1"+"0".repeat(22)),
       decimals: ethers.BigNumber.from("18"),
       owner : null,
       contractAddress: null,
       index : null
      },
  ]


  before(async function () {
    let accounts = await ethers.getSigners();
    [deployer, user1, person1, person2, person3, person4, person5, person6 ] = accounts
    tokenContracts[0].owner = user1;
    tokenContracts[1].owner = person1;
    tokenContracts[2].owner = person2;

    provider = ethers.provider;
  });

  it("deploy ERC20AFactory ", async function() {
    const ERC20AFactory = await ethers.getContractFactory("ERC20AFactory");

    factory = await ERC20AFactory.connect(deployer).deploy();

    let code = await deployer.provider.getCode(factory.address);
    expect(code).to.not.eq("0x");
  });

  it("deploy ERC20A ", async function() {

    for(let i=0; i< tokenContracts.length; i++){
      let tokenContract = tokenContracts[i];
      let prevTotalCreatedContracts = await factory.totalCreatedContracts();

      await factory.connect(deployer).create(tokenContract.name, tokenContract.symbol, tokenContract.initialSupply, tokenContract.owner.address );
      let afterTotalCreatedContracts = await factory.totalCreatedContracts();

      tokenContract.index = prevTotalCreatedContracts;
      expect(afterTotalCreatedContracts).to.be.equal(tokenContract.index.add(1));

      let info = await factory.connect(deployer).getContracts(tokenContract.index);
      expect(info.name).to.be.equal(tokenContract.name);
      tokenContract.contractAddress = info.contractAddress;

      const tokenA = await ethers.getContractAt("ERC20A", tokenContract.contractAddress);
      expect(await tokenA.hasRole(MINTER_ROLE, deployer.address)).to.be.equal(false);
      expect(await tokenA.hasRole(SNAPSHOT_ROLE, deployer.address)).to.be.equal(false);
      expect(await tokenA.hasRole(MINTER_ROLE, tokenContract.owner.address)).to.be.equal(true);
      expect(await tokenA.hasRole(SNAPSHOT_ROLE, tokenContract.owner.address)).to.be.equal(true);

      expect(await tokenA.name()).to.be.equal(tokenContract.name);
      expect(await tokenA.symbol()).to.be.equal(tokenContract.symbol);
      expect(await tokenA.decimals()).to.be.equal(tokenContract.decimals);
      expect(await tokenA.totalSupply()).to.be.equal(tokenContract.initialSupply);
      expect(await tokenA.balanceOf(tokenContract.owner.address)).to.be.equal(tokenContract.initialSupply);
    }

  });

});
