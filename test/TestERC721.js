const {ethers, deployments} = require("hardhat");
const {expect} = require("chai");

describe("ERC721 Test", async () => {
    it("Should be able to deploy", async () => {
        await main();
    })
})

async function main() {
    await deployments.fixture(['deployNftAuction']);
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
    );


    //3. 购买者参与拍卖
    await nftAuction.connect(buyer).placeBid(0, {value: ethers.parseEther("0.000000000000000002")});

    //4.结束拍卖
    await new Promise(resolve => setTimeout(resolve, 10 * 1000));
    await nftAuction.connect(signer).endAuction(0);

    //5.验证NFT所有权
    const owner = await testERC721.ownerOf(tokenId);
    console.log("Owner:", owner);
    expect(owner).to.equal(buyer.address);

    //6.验证余额
    const buyerBalance = await ethers.provider.getBalance(buyer.address);
    const signerBalance = await ethers.provider.getBalance(signer.address);

    console.log("买家余额:", ethers.formatEther(buyerBalance), "ETH");
    console.log("卖家余额:", ethers.formatEther(signerBalance), "ETH");

}