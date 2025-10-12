const {ethers, deployments} = require("hardhat");
const {expect} = require("chai");

describe("Auction Test", async () => {
    it("Should be able to deploy", async () => {
        await main();
    })
})

async function main() {
    await deployments.fixture(['deployNftAuction']);
    const nftAuctionProxy = await deployments.get("NftAuctionProxy");

    const [signer, buyer] = await ethers.getSigners();
    const nftAuction = await ethers.getContractAt("NftAuction", nftAuctionProxy.address);

    //0. 部署ERC20
    const TestERC20 = await ethers.getContractFactory("TestERC20");
    const testERC20 = await TestERC20.deploy();
    await testERC20.waitForDeployment();
    const UsdcAddress  = await testERC20.getAddress();
    //给buyer转1000ETH
    let tx = await testERC20.connect(signer).transfer(buyer, ethers.parseEther("1000"));
    await tx.wait();

    // 部署自定义预言机
    const aggreagatorV3 = await ethers.getContractFactory("AggreagatorV3");
    const priceFeedEthDeploy = await aggreagatorV3.deploy(ethers.parseEther("10000"));
    const priceFeedEth = await priceFeedEthDeploy.waitForDeployment();
    const priceFeedEthAddress = await priceFeedEth.getAddress();
    console.log("ethFeed: ", priceFeedEthAddress)
    const priceFeedUSDCDeploy = await aggreagatorV3.deploy(ethers.parseEther("1"))
    const priceFeedUSDC = await priceFeedUSDCDeploy.waitForDeployment()
    const priceFeedUSDCAddress = await priceFeedUSDC.getAddress()
    console.log("usdcFeed: ", await priceFeedUSDCAddress)

    const token2Usd = [{
        token: ethers.ZeroAddress,
        priceFeed: priceFeedEthAddress
    }, {
        token: UsdcAddress,
        priceFeed: priceFeedUSDCAddress
    }]

    for (let i = 0; i < token2Usd.length; i++) {
        const { token, priceFeed } = token2Usd[i];
        await nftAuction.setDataFeed(token, priceFeed);
    }

    //1. 部署ERC721合约
    const TestERC721 = await ethers.getContractFactory("TestERC721");
    const testERC721 = await TestERC721.deploy();
    await testERC721.waitForDeployment();
    const testERC721Address = await testERC721.getAddress();
    console.log("TestERC721Address:", testERC721Address);
    //铸造10个连续的NFT
    for (let i = 0; i < 10; i++) {
        await testERC721.mint(signer.address, i + 1);
    }

    const tokenId = 1;

    //2. 调用createAuction方法创建拍卖
    //将所有NFT授权给拍卖者
    await testERC721.connect(signer).setApprovalForAll(nftAuctionProxy.address, true);
    await nftAuction.createAuction(
        10,
        ethers.parseEther("0.01"),
        testERC721Address,
        tokenId,
    );
    const auction = await nftAuction.auctions(0);

    console.log("创建拍卖成功：：", auction);


    //3. 购买者参与拍卖
    //await nftAuction.connect(buyer).placeBid(0, {value: ethers.parseEther("0.000000000000000002")});
    //ETH参与竞价
    tx = await nftAuction.connect(buyer).placeBid(0, 0, ethers.ZeroAddress, { value: ethers.parseEther("0.01") });
    await tx.wait()

    // USDC参与竞价
    //USDC授权
    tx = await testERC20.connect(buyer).approve(nftAuctionProxy.address, ethers.MaxUint256)
    await tx.wait()
    tx = await nftAuction.connect(buyer).placeBid(0, ethers.parseEther("101"), UsdcAddress);
    await tx.wait()

    //4.结束拍卖
    await new Promise(resolve => setTimeout(resolve, 10 * 1000));
    await nftAuction.connect(signer).endAuction(0);


    const auctionResult = await nftAuction.auctions(0);
    console.log("结束拍卖后读取拍卖成功：：", auctionResult);
    expect(auctionResult.highestBidder).to.equal(buyer.address);
    expect(auctionResult.highestBid).to.equal(ethers.parseEther("101"));

    //5.验证NFT所有权
    const owner = await testERC721.ownerOf(tokenId);
    console.log("Owner:", owner);
    expect(owner).to.equal(buyer.address);

}