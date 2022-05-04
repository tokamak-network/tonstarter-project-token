const fs = require('fs');

const {
    keccak256,
  } = require("web3-utils");


task("deploy-token-factory", "")
    .setAction(async function ({ }) {
        const [admin] = await ethers.getSigners();

        const ERC20AFactory = await ethers.getContractFactory("ERC20AFactory");
        let erc20AFactory = await ERC20AFactory.connect(admin).deploy();
        await erc20AFactory.deployed();

        console.log("ERC20AFactory Deployed:", erc20AFactory.address);

        await run("verify", {
            address: erc20AFactory.address,
            constructorArgsParams: [],
        });
  });


task("deploy-project-token", "")
    .addParam("name", "Name")
    .addParam("symbol", "Symbol")
    .setAction(async function ({name, symbol}) {
        const [admin] = await ethers.getSigners();

        const ProjectToken = await ethers.getContractFactory("ProjectToken");
        let projectToken = await ProjectToken.connect(admin).deploy(name, symbol);
        await projectToken.deployed();

        console.log("ProjectToken Deployed:", projectToken.address);

        const ProjectTokenProxy = await ethers.getContractFactory("ProjectTokenProxy");
        const projectTokenProxy = await ProjectTokenProxy.connect(admin).deploy(name, symbol);
        await projectTokenProxy.deployed();

        console.log("ProjectTokenProxy Deployed:", projectTokenProxy.address);
        await (await projectTokenProxy.connect(admin).upgradeTo(projectToken.address)).wait();


        await run("verify", {
            address: projectToken.address,
            constructorArgsParams: [name, symbol],
        });

        await run("verify", {
            address: projectTokenProxy.address,
            constructorArgsParams: [name, symbol],
        });
  });
