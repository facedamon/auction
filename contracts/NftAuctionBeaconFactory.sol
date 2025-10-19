// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8;

import {NftAuction} from "./NftAuction.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";

contract NftAuctionBeaconFactory {

    address[] private auctions;

    //信标合约
    UpgradeableBeacon public beacon;

    event AuctionCreated(address indexed auctionAddress, address indexed creator);
    event BeaconUpgraded(address indexed auctionImplementation);

    constructor(address _auctionImplementation) {
        //创建信标合约并指向初始实现，工厂合约作为 owner
        beacon = new UpgradeableBeacon(_auctionImplementation, address(this));
    }

    //创建拍卖（信标代理）
    function createAuction() external returns(address) {
        //部署代理合约
        bytes memory initData = abi.encodeWithSignature("initialize()");
        BeaconProxy proxy = new BeaconProxy(address(beacon), initData);
        auctions.push(address(proxy));
        //auctionMap[tokenId] = proxy;
        emit AuctionCreated(address(proxy), msg.sender);
        return address(proxy);
    }

    function getAuctions() external view returns (address[] memory) {
        return auctions;
    }

    //获取信标地址
    function getBeacon() external view returns (address) {
        return address(beacon);
    }

    //获取逻辑合约地址
    function getImplementation() external view returns (address) {
        return beacon.implementation();
    }

    //升级所有代理合约
    function upgradeAll(address _newImplementation) external {
        beacon.upgradeTo(_newImplementation);
        emit BeaconUpgraded(_newImplementation);
    }
}
