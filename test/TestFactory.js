const {ethers, deployments, upgrades} = require("hardhat");
const {expect} = require("chai");
const {anyValue, anyUint} = require("@nomicfoundation/hardhat-chai-matchers/withArgs");


describe("AuctionFactory Test", function () {

    let factory;
    let testNft;
    let auctionProxy;
    let tokenId = 1;
    let priceFeedEthAddress;
    let priceFeedUSDCAddress;
    let UsdcAddress;

    beforeEach(async function() {
        [owner, seller, bidder1, bidder2] = await ethers.getSigners();

        //部署v1逻辑合约
        const NftAuctionV1 = await ethers.getContractFactory("NftAuction");
        const v1Impl = await NftAuctionV1.deploy();
        await v1Impl.waitForDeployment();
        console.log("v1Address:", await v1Impl.getAddress());

        //部署工厂
        const AuctionFactory = await ethers.getContractFactory("NftAuctionFactory");
        factory = await AuctionFactory.deploy(await v1Impl.getAddress());
        await factory.waitForDeployment();
        console.log("factoryAddress:", await factory.getAddress());

        //部署NFT
        const TestNFT = await ethers.getContractFactory("TestERC721");
        testNft = await TestNFT.deploy();
        await testNft.waitForDeployment();
        console.log("nftAddress:", await testNft.getAddress());

        //部署ERC20
        const TestERC20 = await ethers.getContractFactory("TestERC20");
        const testERC20 = await TestERC20.deploy();
        await testERC20.waitForDeployment();
        UsdcAddress  = await testERC20.getAddress();
        console.log("usdcaddress:", UsdcAddress);

        console.log("sellerAddress:", seller.address);
        //卖家铸造1个NFT
        await testNft.mint(seller.address, tokenId);

        //卖家授权NFT
        await testNft.connect(seller).approve(seller.address, tokenId);

        // 部署自定义预言机
        const aggreagatorV3 = await ethers.getContractFactory("AggreagatorV3");
        const priceFeedEthDeploy = await aggreagatorV3.deploy(ethers.parseEther("10000"));
        const priceFeedEth = await priceFeedEthDeploy.waitForDeployment();
        priceFeedEthAddress = await priceFeedEth.getAddress();
        console.log("ethFeed: ", priceFeedEthAddress)
        const priceFeedUSDCDeploy = await aggreagatorV3.deploy(ethers.parseEther("1"))
        const priceFeedUSDC = await priceFeedUSDCDeploy.waitForDeployment()
        priceFeedUSDCAddress = await priceFeedUSDC.getAddress()
        console.log("usdcFeed: ", await priceFeedUSDCAddress)
    });

    describe("工厂合约 Test", function ()  {
        it("应该通过工厂创建新的拍卖实例", async function() {
            await expect(factory.connect(seller).createAuction())
                .to.emit(factory, "AuctionCreated");

            const auctions = await factory.getAuctions();
            expect(auctions.length).to.equal(1);
        })
    })

    describe("V1拍卖 Test", function () {
        let tx;
        beforeEach(async function() {
            //获取拍卖合约
            await factory.connect(seller).createAuction();
            const auctions = await factory.getAuctions();
            const auctionAddress = auctions[0];

            auctionProxy = await ethers.getContractAt("NftAuction", auctionAddress);

            console.log("auctionProxy:", await auctionProxy.getAddress());

            const token2Usd = [{
                token: ethers.ZeroAddress,
                priceFeed: priceFeedEthAddress
            }, {
                token: UsdcAddress,
                priceFeed: priceFeedUSDCAddress
            }]

            for (let i = 0; i < token2Usd.length; i++) {
                const { token, priceFeed } = token2Usd[i];
                await auctionProxy.setDataFeed(token, priceFeed);
            }
            console.log("成功设置预言机");

            //先授权
            await testNft.connect(seller).setApprovalForAll(await auctionProxy.getAddress(), true);

            tx = await auctionProxy.connect(seller).createAuction(
                10,
                ethers.parseEther("0.01"),
                testNft.getAddress(),
                tokenId,
            );
        })

        it("应该正确创建拍卖", async function() {
            await expect(tx).to.emit(auctionProxy, "AuctionCreated")
             //   .withArgs(1, seller.address,await testNft.getAddress(), tokenId, ethers.parseEther("0.01"), anyValue());
        });

        it("应该接受出价", async function() {
            //出价
            await expect(auctionProxy.connect(bidder1).placeBid(0, 0, ethers.ZeroAddress, { value: ethers.parseEther("0.02") }))
                .to.emit(auctionProxy, "NewBid");

        });
    });

    describe("V2升级 Test", function (){
        let tx;
        beforeEach(async function() {
            //获取拍卖合约
            await factory.connect(seller).createAuction();
            const auctions = await factory.getAuctions();
            const auctionAddress = auctions[0];

            console.log("auctionAddress:", auctionAddress);

            // 获取新创建的代理合约实例
            auctionProxy = await ethers.getContractAt("NftAuction", auctionAddress);

            //先授权
            await testNft.connect(seller).setApprovalForAll(await auctionProxy.getAddress(), true);
            tx = await auctionProxy.connect(seller).createAuction(
                10,
                ethers.parseEther("0.01"),
                testNft.getAddress(),
                tokenId,
            );

            // 部署 V2 实现合约
            const NftAuctionV2 = await ethers.getContractFactory("NftAuctionV2");
            const v2Implementation = await NftAuctionV2.deploy();
            await v2Implementation.waitForDeployment();
            const v2ImplAddress = await v2Implementation.getAddress();

            console.log("V2 Implementation:", v2ImplAddress);

            // 通过工厂合约升级
            const upgradeTx = await factory.upgradeAuction(auctionAddress, v2ImplAddress);
            await upgradeTx.wait();

            // 现在使用 V2 接口访问代理
            auctionProxy = await ethers.getContractAt("NftAuctionV2", auctionAddress);

            console.log("auctionProxy V2:", await auctionProxy.getAddress());
        });

        it("升级到V2并保持数据", async function() {
            expect(await auctionProxy.getVersion()).to.equal("V2.0");
            console.log(await auctionProxy.testHello());
            console.log(await auctionProxy.nextAuctionId());
            //升级后已经创建的拍卖还在
            expect(await auctionProxy.nextAuctionId()).to.equal(1);
        })
    });
})