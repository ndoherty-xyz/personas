import type { Address as EthereumAddress, Hex } from "viem";

/**
 * Associated Account Record (AAR)
 * Matches the Personas contract struct exactly
 */
export type AssociatedAccountRecord = {
  initiator: Hex; // ERC-7930 formatted address bytes
  approver: Hex; // ERC-7930 formatted address bytes
  validAt: number; // uint40 in contract (fits safely in JS number)
  validUntil: number; // uint40 in contract, 0 = no expiry
  interfaceId: Hex; // bytes4 - protocol namespace
  data: Hex; // arbitrary context data
};

/**
 * Signed Association Record (SAR)
 * Complete association with both signatures
 */
export type SignedAssociationRecord = {
  revokedAt: number; // uint40 - 0 if active
  initiatorKeyType: Hex; // bytes2 - key type enum
  approverKeyType: Hex; // bytes2 - key type enum
  initiatorSignature: Hex; // signature bytes
  approverSignature: Hex; // signature bytes
  record: AssociatedAccountRecord; // the underlying AAR
};

/**
 * Pending Proposal
 * Proposal waiting for approver signature
 */
export type PendingProposal = {
  aar: AssociatedAccountRecord;
  initiatorSignature: Hex;
  initiatorKeyType: Hex; // bytes2
  createdAt: number; // uint40
  exists: boolean;
};

/**
 * Key types supported by the contract
 * These are bytes2 values (2 bytes, not 1)
 */
export const KeyType = {
  // Cryptographic curves
  DELEGATED: "0x0000" as const,
  ECDSA_SECP256K1: "0x0001" as const, // K1 - standard ethereum
  ECDSA_SECP256R1: "0x0002" as const, // R1 - P256
  BLS: "0x0003" as const,
  EdDSA: "0x0004" as const,

  // Protocol integrations (0x8000 bit flag set)
  WEBAUTHN: "0x8001" as const,
  ERC1271: "0x8002" as const, // smart contract wallets
  ERC6492: "0x8003" as const, // predeploy contracts
} as const;

export type KeyTypeValue = (typeof KeyType)[keyof typeof KeyType];

/**
 * Proposal status from subgraph
 */
export type ProposalStatus = "PENDING" | "ACCEPTED" | "REJECTED";

/**
 * Options for querying associations
 */
export type AssociationQueryOptions = {
  activeOnly?: boolean;
  asInitiator?: boolean;
  asApprover?: boolean;
  interfaceId?: Hex;
  first?: number;
  skip?: number;
};

/**
 * Options for querying proposals
 */
export type ProposalQueryOptions = {
  status?: ProposalStatus;
  asInitiator?: boolean;
  asApprover?: boolean;
  first?: number;
  skip?: number;
};

/**
 * Network configuration
 */
export type NetworkConfig = {
  chainId: number;
  contractAddress: EthereumAddress;
  subgraphUrl?: string;
};

// Re-export viem types for convenience
export type { EthereumAddress, Hex };
