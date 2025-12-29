// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {InteroperableAddress} from "@openzeppelin/contracts/utils/draft-InteroperableAddress.sol";

/// @dev EIP-155 chain type identifier for EVM chains
bytes2 constant EIP155_CHAIN_TYPE = 0x0000;
import {DataTypes} from "../types/DataTypes.sol";
import "../types/KeyTypes.sol";

/// @title ValidationLib
/// @notice Helper library for validating signatures and associations
library ValidationLib {
    error UnsupportedKeyType(bytes2 keyType);
    error UnsupportedChainType(bytes2 chainType);
    error InvalidTimestamps();

    /// @notice EIP-712 domain separator
    bytes32 private constant DOMAIN_SEPARATOR = keccak256(
        abi.encode(
            keccak256("EIP712Domain(string name,string version)"),
            keccak256(bytes("AssociatedAccounts")),
            keccak256(bytes("1"))
        )
    );

    /// @notice EIP-712 typehash for AAR
    bytes32 private constant AAR_TYPEHASH = keccak256(
        "AssociatedAccountRecord(bytes initiator,bytes approver,uint40 validAt,uint40 validUntil,bytes4 interfaceId,bytes data)"
    );

    /// @notice Compute EIP-712 hash of an AAR
    function computeHash(DataTypes.AssociatedAccountRecord memory aar) 
        internal 
        pure 
        returns (bytes32) 
    {
        return keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        AAR_TYPEHASH,
                        keccak256(aar.initiator),
                        keccak256(aar.approver),
                        aar.validAt,
                        aar.validUntil,
                        aar.interfaceId,
                        keccak256(aar.data)
                    )
                )
            )
        );
    }

    /// @notice Validate a complete SAR (timestamps, revocation, and signatures)
    function validateSAR(DataTypes.SignedAssociationRecord memory sar) 
        internal 
        view 
        returns (bool) 
    {
        if (sar.record.validAt == 0) return false;
        if (sar.record.validUntil != 0 && sar.record.validUntil <= sar.record.validAt) return false;
        if (block.timestamp < sar.record.validAt) return false;
        if (sar.record.validUntil != 0 && block.timestamp >= sar.record.validUntil) return false;
        if (sar.revokedAt != 0 && block.timestamp >= sar.revokedAt) return false;
        if (sar.initiatorSignature.length == 0 || sar.approverSignature.length == 0) return false;

        bytes32 hash = computeHash(sar.record);

        if (!_verifySignature(sar.record.initiator, sar.initiatorKeyType, sar.initiatorSignature, hash)) {
            return false;
        }
        if (!_verifySignature(sar.record.approver, sar.approverKeyType, sar.approverSignature, hash)) {
            return false;
        }

        return true;
    }

    function _verifySignature(
        bytes memory account,
        bytes2 keyType,
        bytes memory signature,
        bytes32 hash
    ) private view returns (bool) {
        (bytes2 chainType, , bytes memory addr) = InteroperableAddress.parseV1(account);

        // Only EVM chains supported
        if (chainType != EIP155_CHAIN_TYPE) revert UnsupportedChainType(chainType);
        if (addr.length != 20) return false;
        
        address accountAddr = address(bytes20(addr));

        if (keyType == K1) {
            return SignatureChecker.isValidSignatureNow(accountAddr, hash, signature);
        } else if (keyType == ERC1271) {
            return SignatureChecker.isValidERC1271SignatureNow(accountAddr, hash, signature);
        } else {
            revert UnsupportedKeyType(keyType);
        }
    }
}