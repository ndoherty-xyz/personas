import {
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  type Hex,
  type Address as EthereumAddress,
} from "viem";
import type {
  Address,
  AssociatedAccountRecord,
  SignedAssociationRecord,
} from "../types";

/**
 * Compute the keccak256 hash of an ethereum address
 */
export function hashAddress(address: EthereumAddress): Hex {
  return keccak256(
    encodeAbiParameters(parseAbiParameters("address"), [address])
  );
}

/**
 * Compute the hash of an AssociatedAccountRecord
 */
export function hashAAR(aar: AssociatedAccountRecord): Hex {
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters(
        "((bytes32,bytes1),(bytes32,bytes1),uint256,uint256,bytes4,bytes)"
      ),
      [
        [
          [aar.initiator.addressHash, aar.initiator.keyType],
          [aar.approver.addressHash, aar.approver.keyType],
          aar.validAt,
          aar.validUntil,
          aar.interfaceId,
          aar.data,
        ],
      ]
    )
  );
}

/**
 * Get the EIP-712 domain for AssociatedAccounts contract
 */
export function getEIP712Domain(
  chainId: number,
  contractAddress: EthereumAddress
) {
  return {
    name: "AssociatedAccounts",
    version: "1",
    chainId: BigInt(chainId),
    verifyingContract: contractAddress,
  } as const;
}

/**
 * Get the EIP-712 typed data for signing an AAR
 */
export function getEIP712TypedData(
  aar: AssociatedAccountRecord,
  chainId: number,
  contractAddress: EthereumAddress
) {
  return {
    domain: getEIP712Domain(chainId, contractAddress),
    types: {
      Address: [
        { name: "addressHash", type: "bytes32" },
        { name: "keyType", type: "bytes1" },
      ],
      AssociatedAccountRecord: [
        { name: "initiator", type: "Address" },
        { name: "approver", type: "Address" },
        { name: "validAt", type: "uint256" },
        { name: "validUntil", type: "uint256" },
        { name: "interfaceId", type: "bytes4" },
        { name: "data", type: "bytes" },
      ],
    },
    primaryType: "AssociatedAccountRecord" as const,
    message: aar,
  } as const;
}

/**
 * Check if an association is currently valid
 */
export function isAssociationValid(
  sar: SignedAssociationRecord,
  currentTimestamp?: bigint
): boolean {
  const now = currentTimestamp ?? BigInt(Math.floor(Date.now() / 1000));

  // Check if revoked
  if (sar.revokedAt !== 0n) {
    return false;
  }

  // Check if valid yet
  if (sar.aar.validAt > now) {
    return false;
  }

  // Check if expired (0 = no expiry)
  if (sar.aar.validUntil !== 0n && sar.aar.validUntil < now) {
    return false;
  }

  return true;
}

/**
 * Detect if address is a smart contract (ERC-1271) or EOA
 */
export async function detectKeyType(
  address: EthereumAddress,
  publicClient: any
): Promise<Hex> {
  try {
    const bytecode = await publicClient.getBytecode({ address });
    // If bytecode exists, it's a smart contract wallet
    return bytecode && bytecode !== "0x" ? "0x01" : "0x00";
  } catch {
    // Default to ECDSA for EOAs
    return "0x00";
  }
}
