// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../src/Personas.sol";
import {DataTypes} from "../src/types/DataTypes.sol";
import {InteroperableAddress} from "@openzeppelin/contracts/utils/draft-InteroperableAddress.sol";

contract CreateTestAssociationScript is Script {
    
    bytes32 private constant DOMAIN_SEPARATOR = keccak256(
        abi.encode(
            keccak256("EIP712Domain(string name,string version)"),
            keccak256(bytes("AssociatedAccounts")),
            keccak256(bytes("1"))
        )
    );
    
    bytes32 private constant AAR_TYPEHASH = keccak256(
        "AssociatedAccountRecord(bytes initiator,bytes approver,uint40 validAt,uint40 validUntil,bytes4 interfaceId,bytes data)"
    );
    
    function computeHash(DataTypes.AssociatedAccountRecord memory aar) internal pure returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                AAR_TYPEHASH,
                keccak256(aar.initiator),
                keccak256(aar.approver),
                aar.validAt,
                aar.validUntil,
                aar.interfaceId,
                keccak256(aar.data)
            )
        );
        
        return keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
    }
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        uint256 alicePrivateKey = vm.envUint("ALICE_PRIVATE_KEY");
        address alice = vm.addr(alicePrivateKey);
        
        Personas personas = Personas(0x049CC05539e8FAbF142Ddaa99A9259287E1457B0);
        
        console.log("Deployer:", deployer);
        console.log("Alice:", alice);
        
        // format addresses as ERC-7930
        bytes memory deployerAddr = InteroperableAddress.formatEvmV1(block.chainid, deployer);
        bytes memory aliceAddr = InteroperableAddress.formatEvmV1(block.chainid, alice);
        
        // create AAR
        DataTypes.AssociatedAccountRecord memory aar = DataTypes.AssociatedAccountRecord({
            initiator: deployerAddr,
            approver: aliceAddr,
            validAt: uint40(block.timestamp),
            validUntil: 0,
            interfaceId: bytes4(0),
            data: bytes("")
        });
        
        // compute hash
        bytes32 hash = computeHash(aar);
        
        // deployer signs
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(deployerPrivateKey, hash);
        bytes memory deployerSig = abi.encodePacked(r, s, v);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // create proposal
        bytes32 proposalHash = personas.proposeAssociation(
            aar,
            deployerSig,
            bytes2(0x0001)
        );
        
        console.log("Proposal created with hash:", vm.toString(proposalHash));
        
        vm.stopBroadcast();
        
        // alice signs
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(alicePrivateKey, hash);
        bytes memory aliceSig = abi.encodePacked(r2, s2, v2);
        
        vm.startBroadcast(alicePrivateKey);
        
        // alice accepts
        personas.acceptProposal(
            proposalHash,
            aliceSig,
            bytes2(0x0001)
        );
        
        console.log("Proposal accepted!");
        
        vm.stopBroadcast();
    }
}