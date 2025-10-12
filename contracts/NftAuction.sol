// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8;

//可升级
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract NftAuction is Initializable, UUPSUpgradeable {

    //结构体
    struct Auction {
        //卖家
        address seller;
        //拍卖持续时间
        uint256 duration;
        //开始时间
        uint256 startTime;
        //起始价格
        uint256 startPrice;
        //是否结束
        bool ended;
        //最高出价格者
        address highestBidder;
        //最高价格
        uint256 highestBid;

        address tokenAddress;
        uint256 tokenId;
    }

    mapping(uint256 nextAuctionId => Auction) public auctions;
    //下一个拍卖ID
    uint256 public nextAuctionId;
    //管理员地址
    address public admin;

    //AggregatorV3Interface internal dataFeed;
    mapping(address tokenAddress => AggregatorV3Interface) dataFeeds;

    function intiialize() initializer public {
        admin = msg.sender;
    }

    function setDataFeed(address _tokenAddress, address _dataFeed) public {
        //dataFeed = AggregatorV3Interface(_dataFeed);
        dataFeeds[_tokenAddress] = AggregatorV3Interface(_dataFeed);
    }

    /**
    * Returns the latest answer.
    */
    function getChainlinkDataFeedLatestAnswer(address _tokenAddress) public view returns (int) {
        AggregatorV3Interface dataFeed = dataFeeds[_tokenAddress];
        // prettier-ignore
        (
        /* uint80 roundId */,
            int256 answer,
        /*uint256 startedAt*/,
        /*uint256 updatedAt*/,
        /*uint80 answeredInRound*/
        ) = dataFeed.latestRoundData();
        return answer;
    }

    //创建拍卖
    function createAuction(uint256 _duration, uint256 _startPrice, address _tokenAddress, uint256 _tokenId) public {
        //只有管理员可以创建拍卖
        require(msg.sender == admin, "Only admin can create auction");
        //检查参数
        require(_duration >= 10, "Duration must be greater than 10s");
        require(_startPrice > 0, "Start price must be greater then zero");

        //转移NFT到合约
        IERC721(_tokenAddress).approve(address(this), _tokenId);

        auctions[nextAuctionId] = Auction({
            seller: msg.sender,
            duration: _duration,
            startTime: block.timestamp,
            startPrice: _startPrice,
            ended: false,
            highestBidder: address(0),
            highestBid: 0,
            tokenAddress: _tokenAddress,
            tokenId: _tokenId
        });

        nextAuctionId++;
    }

    //统一价值尺度
    //ETH 是多少USD  0x694AA1769357215DE4FAC081bf1f309aDC325306   3814 3705 5900 =》3814.37055900
    //USDC是多少USD  0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E   9999 7134  =》0.99997134
    //买家参与买单
    function placeBid(uint256 _auctionID, uint256 amount, address _tokenAddress) external payable {
        Auction storage auction = auctions[_auctionID];
        //判断当前拍卖是否结束
        require(!auction.ended && auction.startTime + auction.duration > block.timestamp, "auction has emded");

        //判断出价是否大于当前最高出价
        uint256 payValue;
        if (_tokenAddress != address(0)) {
            //ERC20
            payValue = amount * uint(getChainlinkDataFeedLatestAnswer(_tokenAddress));
        } else {
            //ETH
            amount = msg.value;
            payValue  = amount * uint(getChainlinkDataFeedLatestAnswer(address(0)));
        }
        uint startPriceValue = auction.startPrice * uint(getChainlinkDataFeedLatestAnswer(auction.tokenAddress));
        uint highestBidValue = auction.highestBid * uint(getChainlinkDataFeedLatestAnswer(auction.tokenAddress));

        require(payValue > highestBidValue && payValue >= startPriceValue, "Bid must be higher than the current highest bid");
        
        IERC20(_tokenAddress).transferFrom(msg.sender, address(this), amount);
        
        //退回之前的最高出价者
        if (auction.tokenAddress != address(0)) {
            payable(auction.highestBidder).transfer(auction.highestBid);
        } else {
            IERC20(auction.tokenAddress).transfer(auction.highestBidder, auction.highestBid);
        }
        auction.highestBidder = msg.sender;
        auction.highestBid = amount;
        auction.tokenAddress = _tokenAddress;
    }

    //结束拍卖
    function endAuction(uint256 _auctionID) external {
        Auction storage auction = auctions[_auctionID];
        //判断当前拍卖是否结束
        require(!auction.ended && auction.startTime + auction.duration <= block.timestamp, "auction has emded");
        //转移NFT到最高出价者
        IERC721(auction.tokenAddress).safeTransferFrom(auction.seller, auction.highestBidder, auction.tokenId);
        //转移剩余的资金到卖家
        payable(auction.seller).transfer(auction.highestBid);
        auction.ended = true;
    }


    function _authorizeUpgrade(address newImplementation) internal override virtual {
        require(msg.sender == admin, "Only admin can upgrade");
    }
}