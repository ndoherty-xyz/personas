import type { Address as EthereumAddress, Hex } from "viem";

/**
 * ERC-7930 Address representation
 */
export type Address = {
  addressHash: Hex; // keccak256(address)
  keyType: Hex; // 0x00 = ECDSA, 0x01 = ERC-1271, etc
};

/**
 * Associated Account Record (AAR)
 */
export type AssociatedAccountRecord = {
  initiator: Address;
  approver: Address;
  validAt: bigint;
  validUntil: bigint; // 0 = no expiry
  interfaceId: Hex; // 4 bytes, optional (0x00000000 if unused)
  data: Hex; // arbitrary data, optional (0x if unused)
};

/**
 * Signature data for EIP-712 signed messages
 */
export type SignatureData = {
  keyType: Hex;
  signature: Hex;
};

/**
 * Signed Association Record (SAR)
 */
export type SignedAssociationRecord = {
  aar: AssociatedAccountRecord;
  initiatorSignature: SignatureData;
  approverSignature: SignatureData;
  revokedAt: bigint; // 0 = not revoked
};

/**
 * Key types supported by ERC-8092
 */
export const KeyType = {
  ECDSA_SECP256K1: "0x00" as const,
  ERC1271: "0x01" as const,
  P256: "0x02" as const,
} as const;

export type KeyTypeValue = (typeof KeyType)[keyof typeof KeyType];

/**
 * Options for querying associations
 */
export type AssociationQueryOptions = {
  activeOnly?: boolean;
  asInitiator?: boolean;
  asApprover?: boolean;
  interfaceId?: Hex;
};

/**
 * Network configuration
 */
export type NetworkConfig = {
  chainId: number;
  contractAddress: EthereumAddress;
  subgraphUrl?: string;
};

export type { EthereumAddress, Hex };
