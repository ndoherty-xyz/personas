import {
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  type Hex,
  type Address as EthereumAddress,
  type PublicClient,
} from "viem";
import type {
  AssociatedAccountRecord,
  SignedAssociationRecord,
} from "../types";

/**
 * Format an Ethereum address as ERC-7930 interoperable address
 *
 * ERC-7930 structure:
 * [version][chainType][chainRefLen][chainRef][addrLen][address]
 *
 * For EVM addresses:
 * - version: 0x0001 (2 bytes)
 * - chainType: 0x0000 (2 bytes, EIP-155)
 * - chainRefLen: 0x03 (1 byte, 3 bytes for chainId)
 * - chainRef: chainId as big-endian (3 bytes)
 * - addrLen: 0x14 (1 byte, 20 bytes for eth address)
 * - address: ethereum address (20 bytes)
 */
export function formatERC7930Address(
  chainId: number,
  address: EthereumAddress
): Hex {
  const version = "0001";
  const chainType = "0000"; // EVM
  const chainRefLen = "03"; // 3 bytes

  // convert chainId to 3-byte hex (big-endian)
  const chainIdHex = chainId.toString(16).padStart(6, "0");

  const addrLen = "14"; // 20 bytes
  const addr = address.toLowerCase().slice(2); // remove 0x

  return ("0x" +
    version +
    chainType +
    chainRefLen +
    chainIdHex +
    addrLen +
    addr) as Hex;
}

/**
 * Hash an ERC-7930 address for indexing/storage lookups
 * This is what the contract uses as keys in mappings
 */
export function hashERC7930Address(erc7930Address: Hex): Hex {
  return keccak256(erc7930Address);
}

/**
 * Compute the hash of an AssociatedAccountRecord
 * This is the unique identifier for an association
 */
export function hashAAR(aar: AssociatedAccountRecord): Hex {
  // EIP-712 hash of the struct
  const AAR_TYPEHASH = keccak256(
    encodeAbiParameters(parseAbiParameters("string"), [
      "AssociatedAccountRecord(bytes initiator,bytes approver,uint40 validAt,uint40 validUntil,bytes4 interfaceId,bytes data)",
    ])
  );

  const DOMAIN_SEPARATOR = keccak256(
    encodeAbiParameters(parseAbiParameters("bytes32,bytes32,bytes32"), [
      keccak256(
        encodeAbiParameters(parseAbiParameters("string"), [
          "EIP712Domain(string name,string version)",
        ])
      ),
      keccak256(
        encodeAbiParameters(parseAbiParameters("string"), [
          "AssociatedAccounts",
        ])
      ),
      keccak256(encodeAbiParameters(parseAbiParameters("string"), ["1"])),
    ])
  );

  const structHash = keccak256(
    encodeAbiParameters(
      parseAbiParameters(
        "bytes32,bytes32,bytes32,uint40,uint40,bytes4,bytes32"
      ),
      [
        AAR_TYPEHASH,
        keccak256(aar.initiator),
        keccak256(aar.approver),
        aar.validAt,
        aar.validUntil,
        aar.interfaceId,
        keccak256(aar.data),
      ]
    )
  );

  return keccak256(
    encodeAbiParameters(parseAbiParameters("bytes1,bytes1,bytes32,bytes32"), [
      "0x19" as Hex,
      "0x01" as Hex,
      DOMAIN_SEPARATOR,
      structHash,
    ])
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
 * This is what wallets display to users for structured signing
 */
export function getEIP712TypedData(
  aar: AssociatedAccountRecord,
  chainId: number,
  contractAddress: EthereumAddress
) {
  return {
    domain: getEIP712Domain(chainId, contractAddress),
    types: {
      AssociatedAccountRecord: [
        { name: "initiator", type: "bytes" },
        { name: "approver", type: "bytes" },
        { name: "validAt", type: "uint40" },
        { name: "validUntil", type: "uint40" },
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
 * Validates timestamps and revocation status
 */
export function isAssociationValid(
  sar: SignedAssociationRecord,
  currentTimestamp?: number
): boolean {
  const now = currentTimestamp ?? Math.floor(Date.now() / 1000);

  // Check if revoked
  if (sar.revokedAt !== 0) {
    return false;
  }

  // Check if valid yet
  if (sar.record.validAt > now) {
    return false;
  }

  // Check if expired (0 = no expiry)
  if (sar.record.validUntil !== 0 && sar.record.validUntil < now) {
    return false;
  }

  return true;
}

/**
 * Detect if address is a smart contract (ERC-1271) or EOA
 * Returns bytes2 key type (0x0001 for EOA, 0x8002 for ERC-1271)
 */
export async function detectKeyType(
  address: EthereumAddress,
  publicClient: PublicClient
): Promise<Hex> {
  try {
    const bytecode = await publicClient.getCode({ address });
    // If bytecode exists, it's a smart contract wallet
    return bytecode && bytecode !== "0x" ? "0x8002" : "0x0001";
  } catch {
    // Default to ECDSA for EOAs
    return "0x0001";
  }
}
