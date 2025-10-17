// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8;

import {NftAuction} from "./NftAuction.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract NftAuctionFactory {

    address[] private auctions;

    //拍卖合约实现地址
    address public immutable auctionImplementation;

    //mapping(uint256 tokenId => ERC1967Proxy) private auctionMap;

    event AuctionCreated(address indexed auctionAddress, address indexed creator);

    constructor(address _auctionImplementation) {
        auctionImplementation = _auctionImplementation;
    }

    function createAuction() external returns(address) {
        //部署代理合约
        bytes memory initData = abi.encodeWithSignature("initialize()");
        ERC1967Proxy proxy = new ERC1967Proxy(auctionImplementation, initData);

        auctions.push(address(proxy));
        //auctionMap[tokenId] = proxy;
        emit AuctionCreated(address(proxy), msg.sender);
        return address(proxy);
    }

    function getAuctions() external view returns (address[] memory) {
        return auctions;
    }

    // 升级代理合约 工厂作为admin有权升级所有它创建的代理合约
    function upgradeAuction(address proxyAddress, address newImplementation) external {
        NftAuction proxy = NftAuction(proxyAddress);
        proxy.upgradeToAndCall(newImplementation, "");
    }

//    function getAuction(uint256 tokenId) external view returns (address) {
//        require(tokenId < auctions.length, "tokenId out of bounds");
//        return address(auctionMap[tokenId]);
//    }
}
