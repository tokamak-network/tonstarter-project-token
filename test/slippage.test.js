const { expect } = require("chai");
const { ethers } = require("hardhat");

const Web3EthAbi = require('web3-eth-abi');
const {
  keccak256,
} = require("web3-utils");

describe("PowerTONSwapper1", function () {

    let powerTONSwapper1, powerTONSwapperProxy , powerTONSwapper;
    let UniswapV3PoolAbi = require("../abi/UniswapV3Pool.json").abi;
    let PowerTONSwapperProxyAbi = require("../abi/PowerTONSwapperProxy.json").abi;
    let PowerTONSwapperAbi = require("../abi/PowerTONSwapper1.json").abi;
    const tosABI = require("../abi/TOS.json").abi;
    const wtonABI = require("../abi/WTON.json").abi;


    let UniswapV3Pool;

    // mainnet
    // let tosAddress = "0x409c4D8cd5d2924b9bc5509230d16a61289c8153";
    // let wtonAddress = "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2";
    // let wtontosPool = "0x1c0ce9aaa0c12f53df3b4d8d77b82d6ad343b4e4";
    // let powertonAddress = "0x516e1af7303a94f81e91e4ac29e20f4319d4ecaf";

    // rinkeby
    let tosAddress = "0x73a54e5C054aA64C1AE7373C2B5474d8AFEa08bd";
    let wtonAddress = "0x709bef48982Bbfd6F2D4Be24660832665F53406C";
    let wtontosPool = "0x516e1af7303a94f81e91e4ac29e20f4319d4ecaf";
    let powertonAddress = "0x0489e74783aF819303512f88f4519B60E559B97C";



    let lpWTONTOS_tokenId_admin = ethers.BigNumber.from("20968");
    let lpWTONTOS_tokenId2_admin = ethers.BigNumber.from("21313");

    let lpWTONTOS_tokenId = ethers.BigNumber.from("6740");
    let lpWTONTOS_tokenId_outofrange = ethers.BigNumber.from("4268");
    let lpTOSZK6_tokenId_zeroliquidity = ethers.BigNumber.from("20813");
    let lpTOSZK5_19316 = ethers.BigNumber.from("19316");

    let admin_tokens = {
        token_normal: lpWTONTOS_tokenId_admin,
        token_otherpool: lpTOSZK5_19316,
        token_normal2: lpWTONTOS_tokenId2_admin,
    }

    let user1_tokens = {
        token_normal: lpWTONTOS_tokenId,
        token_outofrange: lpWTONTOS_tokenId_outofrange,
        zeroliquidity: lpWTONTOS_tokenId_outofrange
    }

    let mintAmount = ethers.BigNumber.from('1'+'0'.repeat(18));
    let mintAmountRay = ethers.BigNumber.from('1'+'0'.repeat(27));
    let case1AmountRay = ethers.BigNumber.from('1'+'0'.repeat(30));
    let zeroBN = ethers.BigNumber.from('0');
    let etherBN = ethers.BigNumber.from('1'+'0'.repeat(18));

    before(async function () {
        accounts = await ethers.getSigners();
        [admin ] = accounts
        provider = ethers.provider;

        await hre.ethers.provider.send("hardhat_setBalance", [
            admin.address,
          "0x56BC75E2D63100000",
        ]);

    });

    it("PowerTONSwapperProxy", async function () {
        powerTONSwapperProxy = await ethers.getContractAt(PowerTONSwapperProxyAbi, powertonAddress, ethers.provider);

    });
    it("Create PowerTONSwapper1", async function () {
        const PowerTONSwapper1 = await ethers.getContractFactory("PowerTONSwapper1");

        powerTONSwapper1 = await PowerTONSwapper1.connect(admin).deploy();
        await powerTONSwapper1.deployed();


        await powerTONSwapperProxy.connect(admin).upgradeTo(powerTONSwapper1.address);

        powerTONSwapper = await ethers.getContractAt(PowerTONSwapperAbi, powertonAddress, ethers.provider);
    });
    it("Check TOS Bunner", async function () {

        const tos = new ethers.Contract(
            tosAddress,
            tosABI,
            ethers.provider
        );

        let bunner = await tos.hasRole(keccak256("BURNER"), powertonAddress);
        if (!bunner) {
            await tos.connect(admin).grantRole(keccak256("BURNER"), powertonAddress);
        }
    });
    it("UniswapV3Pool", async function () {
        UniswapV3Pool = await ethers.getContractAt(UniswapV3PoolAbi, wtontosPool, ethers.provider);

    });

    describe("1. PowerTONSwapper1  ", function () {

        it("exchangeWTONtoTOSLimit", async function () {

            let info = await powerTONSwapper.limitPrameters(
                case1AmountRay,
                wtontosPool,
                wtonAddress,
                tosAddress,
                18
            );

            console.log(info);
        });

        it("UniswapV3Pool", async function () {
            let slot0 = await UniswapV3Pool.slot0();
            console.log(slot0);
        });

        it("swapAmount", async function () {

            const wton = new ethers.Contract(
                wtonAddress,
                wtonABI,
                ethers.provider
            );
            let balancePrev = await wton.balanceOf(powertonAddress);

            let tx = await powerTONSwapper.connect(admin).swap(
                case1AmountRay
            );
            await tx.wait();
            let balanceAfter = await wton.balanceOf(powertonAddress);
            console.log(tx);

            console.log('balancePrev WTON',balancePrev);
            console.log('balanceAfter WTON',balanceAfter);


        });

        it("UniswapV3Pool", async function () {
            let slot0 = await UniswapV3Pool.slot0();
            console.log(slot0);
        });

    });

});
