// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8;

import {NftAuction} from "./NftAuction.sol";

//可升级
contract NftAuctionV2 is NftAuction {
    function testHello() public pure returns (string memory) {
        return "test hello";
    }

    function getVersion() public pure returns(string memory) {
        return "V2.0";
    }
}