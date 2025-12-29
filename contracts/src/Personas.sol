// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {DataTypes} from "./types/DataTypes.sol";
import {IPersonas} from "./interfaces/IPersonas.sol";
import {ValidationLib} from "./lib/ValidationLib.sol";
import {InteroperableAddress} from "@openzeppelin/contracts/utils/draft-InteroperableAddress.sol";


contract Personas is IPersonas {
    using EnumerableSet for EnumerableSet.Bytes32Set;

    // ============ STATE VARIABLES ============

    /// @notice Canonical storage for all associations (EIP-8092)
    mapping(bytes32 => DataTypes.SignedAssociationRecord) public associations;

    /// @notice Pending proposals waiting for approver signature
    mapping(bytes32 => DataTypes.PendingProposal) public proposals;

    /// @notice Index of pending proposals by approver
    mapping(bytes32 => EnumerableSet.Bytes32Set) private _pendingByApprover;

    /// @notice Index of pending proposals by initiator
    mapping(bytes32 => EnumerableSet.Bytes32Set) private _pendingByInitiator;

    /// @notice Index of completed associations by account (initiator OR approver)
    mapping(bytes32 => EnumerableSet.Bytes32Set) private _associationsByAccount;

    // ============ ERRORS ============
    
    error InvalidTimestamps();
    error AssociationNotFound();
    error AlreadyRevoked();
    error NotAuthorized();
    error InvalidSignature();
    error ProposalNotFound();
    error ProposalAlreadyExists();

    // ============ EIP-8092 CORE FUNCTIONS ============

    /// @inheritdoc IPersonas
    function registerAssociation(
        DataTypes.SignedAssociationRecord calldata sar
    ) external returns (bytes32 hash) {
        hash = ValidationLib.computeHash(sar.record);
        _storeAssociation(hash, sar);
    }

    /// @inheritdoc IPersonas
    function revokeAssociation(
        bytes32 hash,
        uint40 revokedAt
    ) external {
        DataTypes.SignedAssociationRecord storage sar = associations[hash];
        
        if (sar.record.validAt == 0) revert AssociationNotFound();
        if (sar.revokedAt != 0) revert AlreadyRevoked();

        bytes memory callerAddr = InteroperableAddress.formatEvmV1(block.chainid, msg.sender);
        bytes32 callerHash = keccak256(callerAddr);
        bytes32 initiatorHash = keccak256(sar.record.initiator);
        bytes32 approverHash = keccak256(sar.record.approver);

        if (callerHash != initiatorHash && callerHash != approverHash) {
            revert NotAuthorized();
        }

        uint40 actualRevokedAt = revokedAt > block.timestamp 
            ? revokedAt 
            : uint40(block.timestamp);

        sar.revokedAt = actualRevokedAt;
        emit AssociationRevoked(hash, callerHash, actualRevokedAt);
    }

    /// @inheritdoc IPersonas
    function isValid(bytes32 hash) external view returns (bool) {
        DataTypes.SignedAssociationRecord storage sar = associations[hash];
        
        if (sar.record.validAt == 0) return false;
        if (block.timestamp < sar.record.validAt) return false;
        if (sar.record.validUntil != 0 && block.timestamp >= sar.record.validUntil) return false;
        if (sar.revokedAt != 0 && block.timestamp >= sar.revokedAt) return false;

        return true;
    }

    /// @inheritdoc IPersonas
    function getAssociation(bytes32 hash) 
        external 
        view 
        returns (DataTypes.SignedAssociationRecord memory) 
    {
        return associations[hash];
    }

    // ============ PROPOSAL FUNCTIONS ============

    /// @inheritdoc IPersonas
    function proposeAssociation(
        DataTypes.AssociatedAccountRecord calldata aar,
        bytes calldata initiatorSignature,
        bytes2 initiatorKeyType
    ) external returns (bytes32 hash) {
        hash = ValidationLib.computeHash(aar);

        if (associations[hash].record.validAt != 0) revert ProposalAlreadyExists();
        if (proposals[hash].exists) revert ProposalAlreadyExists();
        if (aar.validAt == 0 || (aar.validUntil != 0 && aar.validUntil <= aar.validAt)) {
            revert InvalidTimestamps();
        }

        proposals[hash] = DataTypes.PendingProposal({
            aar: aar,
            initiatorSignature: initiatorSignature,
            initiatorKeyType: initiatorKeyType,
            createdAt: uint40(block.timestamp),
            exists: true
        });

        bytes32 approverHash = keccak256(aar.approver);
        bytes32 initiatorHash = keccak256(aar.initiator);
        _pendingByApprover[approverHash].add(hash);
        _pendingByInitiator[initiatorHash].add(hash);

        emit ProposalCreated(hash, approverHash, aar);
    }

    /// @inheritdoc IPersonas
    function acceptProposal(
        bytes32 hash,
        bytes calldata approverSignature,
        bytes2 approverKeyType
    ) external {
        DataTypes.PendingProposal storage proposal = proposals[hash];
        if (!proposal.exists) revert ProposalNotFound();

        DataTypes.SignedAssociationRecord memory sar = DataTypes.SignedAssociationRecord({
            revokedAt: 0,
            initiatorKeyType: proposal.initiatorKeyType,
            approverKeyType: approverKeyType,
            initiatorSignature: proposal.initiatorSignature,
            approverSignature: approverSignature,
            record: proposal.aar
        });

        _storeAssociation(hash, sar);
        _cleanupProposal(hash, proposal);
        emit ProposalAccepted(hash, keccak256(proposal.aar.approver));
    }

    /// @inheritdoc IPersonas
    function rejectProposal(bytes32 hash) external {
        DataTypes.PendingProposal storage proposal = proposals[hash];
        if (!proposal.exists) revert ProposalNotFound();

        bytes memory callerAddr = InteroperableAddress.formatEvmV1(block.chainid, msg.sender);
        bytes32 callerHash = keccak256(callerAddr);
        bytes32 approverHash = keccak256(proposal.aar.approver);
        
        if (callerHash != approverHash) revert NotAuthorized();

        _cleanupProposal(hash, proposal);
        emit ProposalRejected(hash, approverHash);
    }

    /// @inheritdoc IPersonas
    function getPendingProposals(bytes calldata approverAddress)
        external
        view
        returns (bytes32[] memory)
    {
        bytes32 approverHash = keccak256(approverAddress);
        return _pendingByApprover[approverHash].values();
    }

    /// @inheritdoc IPersonas
    function getProposal(bytes32 hash)
        external
        view
        returns (DataTypes.PendingProposal memory)
    {
        return proposals[hash];
    }

    // ============ QUERY FUNCTIONS ============

    /// @notice Get all association hashes for a given account
    function getAssociationHashesForAccount(bytes calldata account)
        external
        view
        returns (bytes32[] memory)
    {
        bytes32 accountHash = keccak256(account);
        return _associationsByAccount[accountHash].values();
    }

    /// @notice Get all complete associations for a given account
    function getAssociationsForAccount(bytes calldata account)
        external
        view
        returns (DataTypes.SignedAssociationRecord[] memory)
    {
        bytes32 accountHash = keccak256(account);
        bytes32[] memory hashes = _associationsByAccount[accountHash].values();
        
        DataTypes.SignedAssociationRecord[] memory results = 
            new DataTypes.SignedAssociationRecord[](hashes.length);
        
        for (uint256 i = 0; i < hashes.length; i++) {
            results[i] = associations[hashes[i]];
        }
        
        return results;
    }

    /// @notice Get only active (non-revoked, currently valid) associations for account
    function getActiveAssociationsForAccount(bytes calldata account)
        external
        view
        returns (DataTypes.SignedAssociationRecord[] memory)
    {
        bytes32 accountHash = keccak256(account);
        bytes32[] memory hashes = _associationsByAccount[accountHash].values();
        
        uint256 activeCount = 0;
        for (uint256 i = 0; i < hashes.length; i++) {
            if (this.isValid(hashes[i])) activeCount++;
        }
        
        DataTypes.SignedAssociationRecord[] memory results = 
            new DataTypes.SignedAssociationRecord[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < hashes.length; i++) {
            if (this.isValid(hashes[i])) {
                results[index] = associations[hashes[i]];
                index++;
            }
        }
        
        return results;
    }

    /// @notice Check if two accounts have an active association
    function areAccountsAssociated(bytes calldata account1, bytes calldata account2)
        external
        view
        returns (bool)
    {
        bytes32 account1Hash = keccak256(account1);
        bytes32 account2Hash = keccak256(account2);
        bytes32[] memory hashes = _associationsByAccount[account1Hash].values();
        
        for (uint256 i = 0; i < hashes.length; i++) {
            DataTypes.SignedAssociationRecord storage sar = associations[hashes[i]];
            bytes32 initiatorHash = keccak256(sar.record.initiator);
            bytes32 approverHash = keccak256(sar.record.approver);
            
            bool involvesAccount2 = (initiatorHash == account2Hash) || (approverHash == account2Hash);
            if (involvesAccount2 && this.isValid(hashes[i])) return true;
        }
        
        return false;
    }

    // ============ INTERNAL FUNCTIONS ============

    function _storeAssociation(
        bytes32 hash,
        DataTypes.SignedAssociationRecord memory sar
    ) internal {
        if (!ValidationLib.validateSAR(sar)) revert InvalidSignature();

        associations[hash] = sar;

        bytes32 initiatorHash = keccak256(sar.record.initiator);
        bytes32 approverHash = keccak256(sar.record.approver);
        _associationsByAccount[initiatorHash].add(hash);
        _associationsByAccount[approverHash].add(hash);

        emit AssociationCreated(hash, initiatorHash, approverHash, sar);
    }

    function _cleanupProposal(
        bytes32 hash,
        DataTypes.PendingProposal storage proposal
    ) internal {
        bytes32 approverHash = keccak256(proposal.aar.approver);
        bytes32 initiatorHash = keccak256(proposal.aar.initiator);

        _pendingByApprover[approverHash].remove(hash);
        _pendingByInitiator[initiatorHash].remove(hash);
        delete proposals[hash];
    }
}