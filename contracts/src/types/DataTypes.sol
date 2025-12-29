// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

library DataTypes {
    /// @notice The core association record (unsigned)
    /// @dev This is what both parties sign over using EIP-712
    struct AssociatedAccountRecord {
        bytes initiator;     // ERC-7930 address (can be any chain)
        bytes approver;      // ERC-7930 address (can be any chain)
        uint40 validAt;      // timestamp when association becomes valid
        uint40 validUntil;   // timestamp when it expires (0 = never expires)
        bytes4 interfaceId;  // optional namespace/selector for the data field
        bytes data;          // optional arbitrary context
    }

    /// @notice Complete association with both signatures
    /// @dev This gets stored onchain after both parties sign
    struct SignedAssociationRecord {
        uint40 revokedAt;              // 0 if active, timestamp if revoked
        bytes2 initiatorKeyType;       // crypto curve/protocol for initiator
        bytes2 approverKeyType;        // crypto curve/protocol for approver
        bytes initiatorSignature;      // initiator's signature over AAR
        bytes approverSignature;       // approver's signature over AAR
        AssociatedAccountRecord record; // the underlying AAR
    }

    /// @notice Pending proposal waiting for approver's signature
    /// @dev Not part of EIP-8092 spec
    struct PendingProposal {
        AssociatedAccountRecord aar;   // the proposed association
        bytes initiatorSignature;      // initiator already signed
        bytes2 initiatorKeyType;       // their key type
        uint40 createdAt;              // when proposal was created
        bool exists;                   // tracking flag
    }
}