// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8;

import {NftAuction} from "./NftAuction.sol";

contract NftAuctionFactory {

    address[] private auctions;

    mapping(uint256 tokenId => NftAuction) private auctionMap;

    event AuctionCreated(address indexed auctionAddress, uint256 tokenId);

    function createAuction(
        uint256 duration,
        uint256 startPrice,
        address nftContractAddress,
        uint256 tokenId) external returns(address) {
        NftAuction auction = new NftAuction();
        auction.intialize();
        auctions.push(address(auction));
        auctionMap[tokenId] = auction;

        emit AuctionCreated(address(auction), tokenId);
        return address(auction);
    }

    function getAuction() external view returns (address[] memory) {
        return auctions;
    }

    function getAuction(uint256 tokenId) external view returns (address) {
        require(tokenId < auctions.length, "tokenid out of bounds");
        return auctions[tokenId];
    }
}
