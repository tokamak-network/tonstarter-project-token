const fs = require('fs');

const {
    keccak256,
  } = require("web3-utils");


task("deploy-token-factory", "Deploy tokenFactory")
    .setAction(async function ({ }) {
        const [admin] = await ethers.getSigners();

        // await hre.ethers.provider.send("hardhat_setBalance", [
        //     admin.address,
        //     "0x56BC75E2D63100000",
        // ]);

        const ERC20AFactory = await ethers.getContractFactory("ERC20AFactory");
        let erc20AFactory = await ERC20AFactory.connect(admin).deploy();
        await erc20AFactory.deployed();

        console.log("ERC20AFactory Deployed:", erc20AFactory.address);

        await run("verify", {
            address: erc20AFactory.address,
            constructorArgsParams: [],
        });
  });


task("deploy-project-token", "Deploy projectToken")
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


task("change-owner-token-and-project", "Change the owner of TokenFactory and ProjectToken")
  .addParam("tokenFactoryAddress", "TokenFactory Address")
  .addParam("projectTokenAddress", "ProjectToken Address")
  .addParam("newOwnerAddress", "New Owner Address")
  .setAction(async function ({tokenFactoryAddress, projectTokenAddress, newOwnerAddress}) {
        const [admin] = await ethers.getSigners();


        const ERC20AFactoryABI = JSON.parse(await fs.readFileSync("./abi/ERC20AFactory.json")).abi;
        const ProjectTokenProxyABI = JSON.parse(await fs.readFileSync("./abi/ProjectTokenProxy.json")).abi;
        const ProjectTokenABI = JSON.parse(await fs.readFileSync("./abi/ProjectToken.json")).abi;

        const erc20AFactory = new ethers.Contract(
            tokenFactoryAddress,
            ERC20AFactoryABI,
            ethers.provider
        );

        let DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
        let tx = await erc20AFactory.connect(admin).grantRole(DEFAULT_ADMIN_ROLE, newOwnerAddress);
        await tx.wait();
        console.log("ERC20AFactory grantRole(DEFAULT_ADMIN_ROLE) to newOwnerAddress:  tx:", tx.hash);

        let hasRole = await erc20AFactory.connect(admin).hasRole(DEFAULT_ADMIN_ROLE, newOwnerAddress);
        console.log("ERC20AFactory newOwnerAddress hasRole(DEFAULT_ADMIN_ROLE) :", hasRole);

        const projectTokenProxy = new ethers.Contract(
            projectTokenAddress,
            ProjectTokenProxyABI,
            ethers.provider
        );

        let tx1 = await projectTokenProxy.connect(admin).transferOwnership(newOwnerAddress);
        await tx1.wait();
        console.log("ProjectTokenProxy transferOwnership to newOwnerAddress : tx:", tx1.hash);

        let newOwner = await projectTokenProxy.connect(admin)._owner();
        console.log("ProjectTokenProxy _owner  :", newOwner);


        const projectToken = new ethers.Contract(
            projectTokenAddress,
            ProjectTokenABI,
            ethers.provider
        );

        let isOwner = await projectToken.connect(admin).isOwner(admin.address);
        console.log("ProjectTokenProxy isOwner(",admin.address,") :", isOwner);
});


task("display-owner-token-and-project", "Display the owner of TokenFactory and ProjectToken")
  .addParam("tokenFactoryAddress", "TokenFactory Address")
  .addParam("projectTokenAddress", "ProjectToken Address")
  .addParam("ownerAddress", "Owner Address")
  .setAction(async function ({tokenFactoryAddress, projectTokenAddress, ownerAddress}) {
        const [admin] = await ethers.getSigners();
        let DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

        const ERC20AFactoryABI = JSON.parse(await fs.readFileSync("./abi/ERC20AFactory.json")).abi;
        const ProjectTokenProxyABI = JSON.parse(await fs.readFileSync("./abi/ProjectTokenProxy.json")).abi;
        const ProjectTokenABI = JSON.parse(await fs.readFileSync("./abi/ProjectToken.json")).abi;

        const erc20AFactory = new ethers.Contract(
            tokenFactoryAddress,
            ERC20AFactoryABI,
            ethers.provider
        );

        let hasRole = await erc20AFactory.connect(admin).hasRole(DEFAULT_ADMIN_ROLE, ownerAddress);
        console.log("ERC20AFactory ownerAddress hasRole(DEFAULT_ADMIN_ROLE) :", hasRole);

        const projectTokenProxy = new ethers.Contract(
            projectTokenAddress,
            ProjectTokenProxyABI,
            ethers.provider
        );

        let _owner = await projectTokenProxy.connect(admin)._owner();
        console.log("ProjectTokenProxy _owner  :", _owner);


        const projectToken = new ethers.Contract(
            projectTokenAddress,
            ProjectTokenABI,
            ethers.provider
        );

        let isOwner = await projectToken.connect(admin).isOwner(ownerAddress);
        console.log("ProjectTokenProxy isOwner(",ownerAddress,") :", isOwner);

});


task("renounce-owner-token", "renounce the owner of TokenFactory")
  .addParam("tokenFactoryAddress", "TokenFactory Address")
  .setAction(async function ({tokenFactoryAddress }) {
        const [admin] = await ethers.getSigners();
        let DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

        const ERC20AFactoryABI = JSON.parse(await fs.readFileSync("./abi/ERC20AFactory.json")).abi;

        const erc20AFactory = new ethers.Contract(
            tokenFactoryAddress,
            ERC20AFactoryABI,
            ethers.provider
        );

        let tx = await erc20AFactory.connect(admin).renounceRole(DEFAULT_ADMIN_ROLE, admin.address);
        console.log("ERC20AFactory renounceRole :", tx.hash);

        let hasRole = await erc20AFactory.connect(admin).hasRole(DEFAULT_ADMIN_ROLE, admin.address);
        console.log("ERC20AFactory ",admin.address," hasRole(DEFAULT_ADMIN_ROLE) :", hasRole);
});
