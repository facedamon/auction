// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8;

import {NftAuction} from "./NftAuction.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract NftAuctionFactory {

    address[] private auctions;

    mapping(uint256 tokenId => NftAuction) private auctionMap;

    event AuctionCreated(address indexed auctionAddress, uint256 tokenId);

    /**
     * 修改逻辑：
     *   1. 先将 NFT 从用户转移到工厂
     *   2. 创建拍卖合约
     *   3. 工厂授权拍卖合约可以操作NFT
     *   4. 拍卖合约的 createAuction 会从工厂（msg.sender）转移 NFT 到自己
     */
    function createAuction(
        uint256 duration,
        uint256 startPrice,
        address nftContractAddress,
        uint256 tokenId) external returns(address) {
            IERC721(nftContractAddress).safeTransferFrom(msg.sender, address(this), tokenId);

            NftAuction auction = new NftAuction();
            auction.initialize();

            IERC721(nftContractAddress).approve(address(auction), tokenId);
            auction.createAuction(duration, startPrice, nftContractAddress, tokenId);
            auctions.push(address(auction));
            auctionMap[tokenId] = auction;

            emit AuctionCreated(address(auction), tokenId);
            return address(auction);
    }

    function getAuction() external view returns (address[] memory) {
        return auctions;
    }

    function getAuction(uint256 tokenId) external view returns (address) {
        require(tokenId < auctions.length, "tokenId out of bounds");
        return address(auctionMap[tokenId]);
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
