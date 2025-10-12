const {expect} = require("chai");
const {ethers, deployments, upgrades} = require("hardhat")

// describe("Starting", async function () {
//     it("Should be able to deploy", async function () {
//         const Contract = await ethers.getContractFactory("NftAuction");
//         const contract = await Contract.deploy();
//         await contract.waitForDeployment();

//         await contract.createAuction(
//             100*1000,
//             ethers.parseEther("0.000000000000000001"),
//             ethers.ZeroAddress,
//             1
//         );

//         const auction = await contract.auctions(0);

//         console.log(auction);
//     })
// })

describe("Test upgrade", async function () {
    it("Should be able to deploy", async function () {
        //1. 部署业务合约
        await deployments.fixture(["deployNftAuction"]);
        const nftAuctionProxy = await deployments.get("NftAuctionProxy");

        const [signer, buyer] = await ethers.getSigners();
        //1. 部署ERC721合约
        const TestERC721 = await ethers.getContractFactory("TestERC721");
        const testERC721 = await TestERC721.deploy();
        await testERC721.waitForDeployment();
        const testERC721Address = await testERC721.getAddress();
        console.log("TestERC721Address:", testERC721Address);
        //铸造10个连续的NFT
        for (let i = 0; i < 10; i++) {
            await testERC721.mint(signer, i + 1);
        }
        const tokenId = 1;

        //2. 调用createAuction方法创建拍卖
        const nftAuction = await ethers.getContractAt("NftAuction", nftAuctionProxy.address);
        //将所有NFT授权给拍卖者
        await testERC721.connect(signer).setApprovalForAll(nftAuctionProxy.address, true);
        await nftAuction.createAuction(
            10,
            ethers.parseEther("0.000000000000000001"),
            testERC721Address,
            tokenId,
        )

        const auction = await nftAuction.auctions(0);
        console.log("创建拍卖成功", auction);

        const implAddress = await upgrades.erc1967.getImplementationAddress(nftAuctionProxy.address);


        //3. 升级合约

        await deployments.fixture(["upgradeNftAuction"]);

        const implAddress2 = await upgrades.erc1967.getImplementationAddress(nftAuctionProxy.address);

        //4. 读取合约的acutions[0]
        const nftAuctionV2 = await ethers.getContractAt(
            "NftAuctionV2",
            nftAuctionProxy.address
        );
        const auction2 = await nftAuctionV2.auctions(0);
        const hello = await nftAuctionV2.testHello();
        console.log("hello:", hello);
        expect(auction2.startTime).to.equal(auction.startTime);
        expect(implAddress).to.not.equal(implAddress2);
    })
})