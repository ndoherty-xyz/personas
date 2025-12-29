// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {Personas} from "../src/Personas.sol";
import {DataTypes} from "../src/types/DataTypes.sol";
import {ValidationLib} from "../src/lib/ValidationLib.sol";
import {InteroperableAddress} from "@openzeppelin/contracts/utils/draft-InteroperableAddress.sol";
import "../src/types/KeyTypes.sol";

contract InteractScript is Script {
    Personas personas;
    
    // ⚠️ WARNING: These are Anvil's default test accounts with PUBLIC private keys.
    // NEVER use these keys on mainnet or with real funds!
    // See: https://book.getfoundry.sh/reference/anvil/#default-private-keys
    address constant ALICE = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    address constant BOB = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
    uint256 constant ALICE_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    uint256 constant BOB_KEY = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;
    
    function setUp() public {
        address personasAddr = vm.envAddress("PERSONAS");
        personas = Personas(personasAddr);
    }
    
    function run() external {
        string memory action = vm.envString("ACTION");
        
        if (keccak256(bytes(action)) == keccak256(bytes("propose"))) {
            proposeAssociation();
        } else if (keccak256(bytes(action)) == keccak256(bytes("list"))) {
            listPendingProposals();
        } else if (keccak256(bytes(action)) == keccak256(bytes("accept"))) {
            acceptProposal();
        } else if (keccak256(bytes(action)) == keccak256(bytes("check"))) {
            checkAssociation();
        } else if (keccak256(bytes(action)) == keccak256(bytes("revoke"))) {
            revokeAssociation();
        } else {
            console.log("Unknown action:", action);
            console.log("Available actions: propose, list, accept, check, revoke");
        }
    }
    
    function proposeAssociation() internal {
        console.log("\n=== Creating Proposal ===");
        console.log("Alice:", ALICE);
        console.log("Bob:", BOB);
        
        // create AAR
        bytes memory aliceAddr = InteroperableAddress.formatEvmV1(block.chainid, ALICE);
        bytes memory bobAddr = InteroperableAddress.formatEvmV1(block.chainid, BOB);
        
        DataTypes.AssociatedAccountRecord memory aar = DataTypes.AssociatedAccountRecord({
            initiator: aliceAddr,
            approver: bobAddr,
            validAt: uint40(block.timestamp),
            validUntil: 0,
            interfaceId: bytes4(0),
            data: ""
        });
        
        // alice signs
        bytes32 hash = ValidationLib.computeHash(aar);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ALICE_KEY, hash);
        bytes memory signature = abi.encodePacked(r, s, v);
        
        // propose
        vm.startBroadcast(ALICE_KEY);
        bytes32 proposalHash = personas.proposeAssociation(aar, signature, K1);
        vm.stopBroadcast();
        
        console.log("\nProposal created!");
        console.log("Hash:", vm.toString(proposalHash));
    }
    
    function listPendingProposals() internal {
        console.log("\n=== Pending Proposals for Bob ===");
        
        bytes memory bobAddr = InteroperableAddress.formatEvmV1(block.chainid, BOB);
        bytes32[] memory pending = personas.getPendingProposals(bobAddr);
        
        console.log("Count:", pending.length);
        
        for (uint256 i = 0; i < pending.length; i++) {
            console.log("\nProposal", i);
            console.log("Hash:", vm.toString(pending[i]));
            
            DataTypes.PendingProposal memory proposal = personas.getProposal(pending[i]);
            console.log("Created at:", proposal.createdAt);
            console.log("Initiator:", vm.toString(proposal.aar.initiator));
            console.log("Approver:", vm.toString(proposal.aar.approver));
        }
    }
    
    function acceptProposal() internal {
        console.log("\n=== Bob Accepting Proposal ===");
        
        // get bob's pending proposals
        bytes memory bobAddr = InteroperableAddress.formatEvmV1(block.chainid, BOB);
        bytes32[] memory pending = personas.getPendingProposals(bobAddr);
        
        if (pending.length == 0) {
            console.log("No pending proposals for Bob");
            return;
        }
        
        bytes32 proposalHash = pending[0];
        console.log("Accepting proposal:", vm.toString(proposalHash));
        
        // get the proposal to sign
        DataTypes.PendingProposal memory proposal = personas.getProposal(proposalHash);
        
        // bob signs the same AAR
        bytes32 hash = ValidationLib.computeHash(proposal.aar);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(BOB_KEY, hash);
        bytes memory signature = abi.encodePacked(r, s, v);
        
        // accept
        vm.startBroadcast(BOB_KEY);
        personas.acceptProposal(proposalHash, signature, K1);
        vm.stopBroadcast();
        
        console.log("Proposal accepted!");
        console.log("Association is now active");
    }
    
    function checkAssociation() internal {
        console.log("\n=== Checking Association ===");
        
        bytes memory aliceAddr = InteroperableAddress.formatEvmV1(block.chainid, ALICE);
        bytes memory bobAddr = InteroperableAddress.formatEvmV1(block.chainid, BOB);
        
        bool associated = personas.areAccountsAssociated(aliceAddr, bobAddr);
        console.log("Alice and Bob associated:", associated);
        
        if (associated) {
            // get alice's associations
            DataTypes.SignedAssociationRecord[] memory aliceAssocs = 
                personas.getActiveAssociationsForAccount(aliceAddr);
            
            console.log("\nAlice's active associations:", aliceAssocs.length);
            for (uint256 i = 0; i < aliceAssocs.length; i++) {
                console.log("\nAssociation", i);
                console.log("Valid from:", aliceAssocs[i].record.validAt);
                console.log("Valid until:", aliceAssocs[i].record.validUntil);
                console.log("Revoked at:", aliceAssocs[i].revokedAt);
            }
        }
    }
    
    function revokeAssociation() internal {
        console.log("\n=== Revoking Association ===");
        
        bytes memory aliceAddr = InteroperableAddress.formatEvmV1(block.chainid, ALICE);
        bytes32[] memory hashes = personas.getAssociationHashesForAccount(aliceAddr);
        
        if (hashes.length == 0) {
            console.log("No associations to revoke");
            return;
        }
        
        bytes32 hash = hashes[0];
        console.log("Revoking:", vm.toString(hash));
        
        // alice revokes
        vm.startBroadcast(ALICE_KEY);
        personas.revokeAssociation(hash, 0);
        vm.stopBroadcast();
        
        console.log("Association revoked!");
    }
}