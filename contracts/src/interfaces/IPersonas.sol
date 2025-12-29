// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {DataTypes} from "../types/DataTypes.sol";

interface IPersonas {
    // ============ EVENTS ============
    
    /// @notice Emitted when a complete association is stored onchain
    /// @dev Required by EIP-8092 spec
    event AssociationCreated(
        bytes32 indexed hash,        // keccak256 of the AAR (unique ID)
        bytes32 indexed initiator,   // keccak256 of initiator address
        bytes32 indexed approver,    // keccak256 of approver address
        DataTypes.SignedAssociationRecord sar
    );

    /// @notice Emitted when an association is revoked
    /// @dev Required by EIP-8092 spec
    event AssociationRevoked(
        bytes32 indexed hash,
        bytes32 indexed revokedBy,   // who revoked it
        uint256 revokedAt
    );

    /// @notice Emitted when someone creates a proposal
    /// @dev Our addition - not in EIP-8092
    event ProposalCreated(
        bytes32 indexed hash,
        bytes32 indexed approver,    // who needs to accept
        DataTypes.AssociatedAccountRecord aar
    );

    /// @notice Emitted when approver accepts a proposal
    event ProposalAccepted(
        bytes32 indexed hash,
        bytes32 indexed approver
    );

    /// @notice Emitted when approver rejects a proposal
    event ProposalRejected(
        bytes32 indexed hash,
        bytes32 indexed approver
    );

    // ============ EIP-8092 CORE METHODS ============

    /// @notice Store a complete SAR with both signatures
    /// @dev Direct flow - both parties coordinated offchain
    function registerAssociation(
        DataTypes.SignedAssociationRecord calldata sar
    ) external returns (bytes32 hash);

    /// @notice Revoke an existing association
    /// @dev Either party can revoke
    function revokeAssociation(
        bytes32 hash,
        uint40 revokedAt
    ) external;

    /// @notice Check if an association is currently valid
    function isValid(bytes32 hash) external view returns (bool);

    /// @notice Get a stored association
    function getAssociation(bytes32 hash) 
        external 
        view 
        returns (DataTypes.SignedAssociationRecord memory);

    // ============ PROPOSAL METHODS  ============

    /// @notice Create a proposal (initiator signs first)
    /// @dev Stores half-signed proposal onchain for approver to find
    function proposeAssociation(
        DataTypes.AssociatedAccountRecord calldata aar,
        bytes calldata initiatorSignature,
        bytes2 initiatorKeyType
    ) external returns (bytes32 hash);

    /// @notice Accept a proposal (approver signs and completes)
    /// @dev Moves from pending to complete association
    function acceptProposal(
        bytes32 hash,
        bytes calldata approverSignature,
        bytes2 approverKeyType
    ) external;

    /// @notice Reject a proposal
    function rejectProposal(bytes32 hash) external;

    /// @notice Get all pending proposals for an address
    function getPendingProposals(bytes calldata approverAddress)
        external
        view
        returns (bytes32[] memory);

    /// @notice Get a specific proposal
    function getProposal(bytes32 hash)
        external
        view
        returns (DataTypes.PendingProposal memory);

    // ============ QUERY METHODS ============

    /// @notice Get all association hashes for an account
    function getAssociationHashesForAccount(bytes calldata account)
        external
        view
        returns (bytes32[] memory);

    /// @notice Get all associations for an account
    function getAssociationsForAccount(bytes calldata account)
        external
        view
        returns (DataTypes.SignedAssociationRecord[] memory);

    /// @notice Get only active associations for an account
    function getActiveAssociationsForAccount(bytes calldata account)
        external
        view
        returns (DataTypes.SignedAssociationRecord[] memory);

    /// @notice Check if two accounts have an active association
    function areAccountsAssociated(bytes calldata account1, bytes calldata account2)
        external
        view
        returns (bool);
}