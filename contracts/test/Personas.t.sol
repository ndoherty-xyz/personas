// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {Personas} from "../src/Personas.sol";
import {DataTypes} from "../src/types/DataTypes.sol";
import {ValidationLib} from "../src/lib/ValidationLib.sol";
import {InteroperableAddress} from "@openzeppelin/contracts/utils/draft-InteroperableAddress.sol";
import "../src/types/KeyTypes.sol";

contract PersonasTest is Test {
    Personas public personas;
    
    // test accounts
    uint256 aliceKey = 0xA11CE;
    address alice = vm.addr(aliceKey);
    
    uint256 bobKey = 0xB0B;
    address bob = vm.addr(bobKey);
    
    function setUp() public {
        personas = new Personas();
    }
    
    function test_ProposalFlow() public {
        bytes memory aliceAddr = InteroperableAddress.formatEvmV1(block.chainid, alice);
        bytes memory bobAddr = InteroperableAddress.formatEvmV1(block.chainid, bob);
        
        DataTypes.AssociatedAccountRecord memory aar = DataTypes.AssociatedAccountRecord({
            initiator: aliceAddr,
            approver: bobAddr,
            validAt: uint40(block.timestamp),
            validUntil: 0,
            interfaceId: bytes4(0),
            data: ""
        });
        
        bytes32 aarHash = ValidationLib.computeHash(aar);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(aliceKey, aarHash);
        bytes memory aliceSignature = abi.encodePacked(r1, s1, v1);
        
        vm.prank(alice);
        bytes32 proposalHash = personas.proposeAssociation(aar, aliceSignature, K1);
        
        bytes32[] memory pending = personas.getPendingProposals(bobAddr);
        assertEq(pending.length, 1);
        assertEq(pending[0], proposalHash);
        
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(bobKey, aarHash);
        bytes memory bobSignature = abi.encodePacked(r2, s2, v2);
        
        vm.prank(bob);
        personas.acceptProposal(proposalHash, bobSignature, K1);
        
        pending = personas.getPendingProposals(bobAddr);
        assertEq(pending.length, 0);
        
        DataTypes.SignedAssociationRecord memory sar = personas.getAssociation(proposalHash);
        assertEq(sar.record.initiator, aliceAddr);
        assertEq(sar.record.approver, bobAddr);
        assertTrue(personas.isValid(proposalHash));
    }
    
    function test_DirectRegistration() public {
        bytes memory aliceAddr = InteroperableAddress.formatEvmV1(block.chainid, alice);
        bytes memory bobAddr = InteroperableAddress.formatEvmV1(block.chainid, bob);
        
        DataTypes.AssociatedAccountRecord memory aar = DataTypes.AssociatedAccountRecord({
            initiator: aliceAddr,
            approver: bobAddr,
            validAt: uint40(block.timestamp),
            validUntil: 0,
            interfaceId: bytes4(0),
            data: ""
        });
        
        bytes32 aarHash = ValidationLib.computeHash(aar);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(aliceKey, aarHash);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(bobKey, aarHash);
        
        DataTypes.SignedAssociationRecord memory sar = DataTypes.SignedAssociationRecord({
            revokedAt: 0,
            initiatorKeyType: K1,
            approverKeyType: K1,
            initiatorSignature: abi.encodePacked(r1, s1, v1),
            approverSignature: abi.encodePacked(r2, s2, v2),
            record: aar
        });
        
        vm.prank(alice);
        bytes32 hash = personas.registerAssociation(sar);
        
        assertTrue(personas.isValid(hash));
        
        DataTypes.SignedAssociationRecord memory stored = personas.getAssociation(hash);
        assertEq(stored.record.initiator, aliceAddr);
        assertEq(stored.record.approver, bobAddr);
    }
    
    function test_Revocation() public {
        bytes memory aliceAddr = InteroperableAddress.formatEvmV1(block.chainid, alice);
        bytes memory bobAddr = InteroperableAddress.formatEvmV1(block.chainid, bob);
        
        DataTypes.AssociatedAccountRecord memory aar = DataTypes.AssociatedAccountRecord({
            initiator: aliceAddr,
            approver: bobAddr,
            validAt: uint40(block.timestamp),
            validUntil: 0,
            interfaceId: bytes4(0),
            data: ""
        });
        
        bytes32 aarHash = ValidationLib.computeHash(aar);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(aliceKey, aarHash);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(bobKey, aarHash);
        
        DataTypes.SignedAssociationRecord memory sar = DataTypes.SignedAssociationRecord({
            revokedAt: 0,
            initiatorKeyType: K1,
            approverKeyType: K1,
            initiatorSignature: abi.encodePacked(r1, s1, v1),
            approverSignature: abi.encodePacked(r2, s2, v2),
            record: aar
        });
        
        bytes32 hash = personas.registerAssociation(sar);
        assertTrue(personas.isValid(hash));
        
        vm.prank(alice);
        personas.revokeAssociation(hash, 0);
        
        assertFalse(personas.isValid(hash));
    }
    
    function test_RevertOnInvalidSignature() public {
        bytes memory aliceAddr = InteroperableAddress.formatEvmV1(block.chainid, alice);
        bytes memory bobAddr = InteroperableAddress.formatEvmV1(block.chainid, bob);
        
        DataTypes.AssociatedAccountRecord memory aar = DataTypes.AssociatedAccountRecord({
            initiator: aliceAddr,
            approver: bobAddr,
            validAt: uint40(block.timestamp),
            validUntil: 0,
            interfaceId: bytes4(0),
            data: ""
        });
        
        bytes32 aarHash = ValidationLib.computeHash(aar);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(aliceKey, aarHash);
        
        bytes32 wrongHash = keccak256("wrong");
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(bobKey, wrongHash);
        
        DataTypes.SignedAssociationRecord memory sar = DataTypes.SignedAssociationRecord({
            revokedAt: 0,
            initiatorKeyType: K1,
            approverKeyType: K1,
            initiatorSignature: abi.encodePacked(r1, s1, v1),
            approverSignature: abi.encodePacked(r2, s2, v2),
            record: aar
        });
        
        vm.expectRevert(Personas.InvalidSignature.selector);
        personas.registerAssociation(sar);
    }
    
    function test_RevertOnEmptyInitiatorSignature() public {
        bytes memory aliceAddr = InteroperableAddress.formatEvmV1(block.chainid, alice);
        bytes memory bobAddr = InteroperableAddress.formatEvmV1(block.chainid, bob);
        
        DataTypes.AssociatedAccountRecord memory aar = DataTypes.AssociatedAccountRecord({
            initiator: aliceAddr,
            approver: bobAddr,
            validAt: uint40(block.timestamp),
            validUntil: 0,
            interfaceId: bytes4(0),
            data: ""
        });
        
        bytes32 aarHash = ValidationLib.computeHash(aar);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(bobKey, aarHash);
        
        DataTypes.SignedAssociationRecord memory sar = DataTypes.SignedAssociationRecord({
            revokedAt: 0,
            initiatorKeyType: K1,
            approverKeyType: K1,
            initiatorSignature: "",
            approverSignature: abi.encodePacked(r2, s2, v2),
            record: aar
        });
        
        vm.expectRevert(Personas.InvalidSignature.selector);
        personas.registerAssociation(sar);
    }
    
    function test_RevertOnEmptyApproverSignature() public {
        bytes memory aliceAddr = InteroperableAddress.formatEvmV1(block.chainid, alice);
        bytes memory bobAddr = InteroperableAddress.formatEvmV1(block.chainid, bob);
        
        DataTypes.AssociatedAccountRecord memory aar = DataTypes.AssociatedAccountRecord({
            initiator: aliceAddr,
            approver: bobAddr,
            validAt: uint40(block.timestamp),
            validUntil: 0,
            interfaceId: bytes4(0),
            data: ""
        });
        
        bytes32 aarHash = ValidationLib.computeHash(aar);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(aliceKey, aarHash);
        
        DataTypes.SignedAssociationRecord memory sar = DataTypes.SignedAssociationRecord({
            revokedAt: 0,
            initiatorKeyType: K1,
            approverKeyType: K1,
            initiatorSignature: abi.encodePacked(r1, s1, v1),
            approverSignature: "",
            record: aar
        });
        
        vm.expectRevert(Personas.InvalidSignature.selector);
        personas.registerAssociation(sar);
    }
    
    function test_RevertOnBothEmptySignatures() public {
        bytes memory aliceAddr = InteroperableAddress.formatEvmV1(block.chainid, alice);
        bytes memory bobAddr = InteroperableAddress.formatEvmV1(block.chainid, bob);
        
        DataTypes.AssociatedAccountRecord memory aar = DataTypes.AssociatedAccountRecord({
            initiator: aliceAddr,
            approver: bobAddr,
            validAt: uint40(block.timestamp),
            validUntil: 0,
            interfaceId: bytes4(0),
            data: ""
        });
        
        DataTypes.SignedAssociationRecord memory sar = DataTypes.SignedAssociationRecord({
            revokedAt: 0,
            initiatorKeyType: K1,
            approverKeyType: K1,
            initiatorSignature: "",
            approverSignature: "",
            record: aar
        });
        
        vm.expectRevert(Personas.InvalidSignature.selector);
        personas.registerAssociation(sar);
    }
    
    // ============ FUZZ TESTS ============
    
    function testFuzz_DirectRegistrationWithVariousParams(
        bytes4 interfaceId,
        bytes calldata data
    ) public {
        vm.assume(data.length <= 1000);
        
        bytes memory aliceAddr = InteroperableAddress.formatEvmV1(block.chainid, alice);
        bytes memory bobAddr = InteroperableAddress.formatEvmV1(block.chainid, bob);
        
        DataTypes.AssociatedAccountRecord memory aar = DataTypes.AssociatedAccountRecord({
            initiator: aliceAddr,
            approver: bobAddr,
            validAt: uint40(block.timestamp),
            validUntil: 0,
            interfaceId: interfaceId,
            data: data
        });
        
        bytes32 aarHash = ValidationLib.computeHash(aar);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(aliceKey, aarHash);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(bobKey, aarHash);
        
        DataTypes.SignedAssociationRecord memory sar = DataTypes.SignedAssociationRecord({
            revokedAt: 0,
            initiatorKeyType: K1,
            approverKeyType: K1,
            initiatorSignature: abi.encodePacked(r1, s1, v1),
            approverSignature: abi.encodePacked(r2, s2, v2),
            record: aar
        });
        
        bytes32 hash = personas.registerAssociation(sar);
        
        assertTrue(personas.isValid(hash));
        
        DataTypes.SignedAssociationRecord memory stored = personas.getAssociation(hash);
        assertEq(stored.record.interfaceId, interfaceId);
        assertEq(stored.record.data, data);
    }
    
    function testFuzz_ExpiredAssociationIsInvalid(uint40 validUntil) public {
        validUntil = uint40(bound(validUntil, 100, 365 days));
        uint40 validAt = validUntil - 1;
        
        bytes memory aliceAddr = InteroperableAddress.formatEvmV1(block.chainid, alice);
        bytes memory bobAddr = InteroperableAddress.formatEvmV1(block.chainid, bob);
        
        DataTypes.AssociatedAccountRecord memory aar = DataTypes.AssociatedAccountRecord({
            initiator: aliceAddr,
            approver: bobAddr,
            validAt: validAt,
            validUntil: validUntil,
            interfaceId: bytes4(0),
            data: ""
        });
        
        bytes32 aarHash = ValidationLib.computeHash(aar);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(aliceKey, aarHash);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(bobKey, aarHash);
        
        DataTypes.SignedAssociationRecord memory sar = DataTypes.SignedAssociationRecord({
            revokedAt: 0,
            initiatorKeyType: K1,
            approverKeyType: K1,
            initiatorSignature: abi.encodePacked(r1, s1, v1),
            approverSignature: abi.encodePacked(r2, s2, v2),
            record: aar
        });
        
        vm.warp(validUntil + 1);
        
        vm.expectRevert(Personas.InvalidSignature.selector);
        personas.registerAssociation(sar);
    }
}