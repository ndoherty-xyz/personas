import type { Abi } from "viem";
import type { EthereumAddress } from "../types";

/**
 * Deployed Personas contract addresses by chain ID
 */
export const CONTRACT_ADDRESSES: Record<number, EthereumAddress> = {
  84532: "0x049CC05539e8FAbF142Ddaa99A9259287E1457B0", // Base Sepolia
};

/**
 * Subgraph URLs by chain ID
 */
export const SUBGRAPH_URLS = {
  "base-sepolia":
    "https://api.studio.thegraph.com/query/45616/erc-8092-associations/v0.1.0",
  84532:
    "https://api.studio.thegraph.com/query/45616/erc-8092-associations/v0.1.0",
} as const;

/**
 * Chain configurations
 */
export const CHAIN_CONFIG = {
  baseSepolia: {
    chainId: 84532,
    name: "Base Sepolia",
    contractAddress: CONTRACT_ADDRESSES[84532],
    subgraphUrl: SUBGRAPH_URLS[84532],
  },
} as const;

/**
 * Personas contract ABI
 * Full ABI from deployed contract
 */
export const PERSONAS_ABI = [
  // Write functions
  {
    type: "function",
    name: "proposeAssociation",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "aar",
        type: "tuple",
        components: [
          { name: "initiator", type: "bytes" },
          { name: "approver", type: "bytes" },
          { name: "validAt", type: "uint40" },
          { name: "validUntil", type: "uint40" },
          { name: "interfaceId", type: "bytes4" },
          { name: "data", type: "bytes" },
        ],
      },
      { name: "initiatorSignature", type: "bytes" },
      { name: "initiatorKeyType", type: "bytes2" },
    ],
    outputs: [{ name: "hash", type: "bytes32" }],
  },
  {
    type: "function",
    name: "acceptProposal",
    stateMutability: "nonpayable",
    inputs: [
      { name: "hash", type: "bytes32" },
      { name: "approverSignature", type: "bytes" },
      { name: "approverKeyType", type: "bytes2" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "rejectProposal",
    stateMutability: "nonpayable",
    inputs: [{ name: "hash", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "registerAssociation",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "sar",
        type: "tuple",
        components: [
          { name: "revokedAt", type: "uint40" },
          { name: "initiatorKeyType", type: "bytes2" },
          { name: "approverKeyType", type: "bytes2" },
          { name: "initiatorSignature", type: "bytes" },
          { name: "approverSignature", type: "bytes" },
          {
            name: "record",
            type: "tuple",
            components: [
              { name: "initiator", type: "bytes" },
              { name: "approver", type: "bytes" },
              { name: "validAt", type: "uint40" },
              { name: "validUntil", type: "uint40" },
              { name: "interfaceId", type: "bytes4" },
              { name: "data", type: "bytes" },
            ],
          },
        ],
      },
    ],
    outputs: [{ name: "hash", type: "bytes32" }],
  },
  {
    type: "function",
    name: "revokeAssociation",
    stateMutability: "nonpayable",
    inputs: [
      { name: "hash", type: "bytes32" },
      { name: "revokedAt", type: "uint40" },
    ],
    outputs: [],
  },

  // Read functions
  {
    type: "function",
    name: "getProposal",
    stateMutability: "view",
    inputs: [{ name: "hash", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          {
            name: "aar",
            type: "tuple",
            components: [
              { name: "initiator", type: "bytes" },
              { name: "approver", type: "bytes" },
              { name: "validAt", type: "uint40" },
              { name: "validUntil", type: "uint40" },
              { name: "interfaceId", type: "bytes4" },
              { name: "data", type: "bytes" },
            ],
          },
          { name: "initiatorSignature", type: "bytes" },
          { name: "initiatorKeyType", type: "bytes2" },
          { name: "createdAt", type: "uint40" },
          { name: "exists", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getPendingProposals",
    stateMutability: "view",
    inputs: [{ name: "approverAddress", type: "bytes" }],
    outputs: [{ name: "", type: "bytes32[]" }],
  },
  {
    type: "function",
    name: "getAssociation",
    stateMutability: "view",
    inputs: [{ name: "hash", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "revokedAt", type: "uint40" },
          { name: "initiatorKeyType", type: "bytes2" },
          { name: "approverKeyType", type: "bytes2" },
          { name: "initiatorSignature", type: "bytes" },
          { name: "approverSignature", type: "bytes" },
          {
            name: "record",
            type: "tuple",
            components: [
              { name: "initiator", type: "bytes" },
              { name: "approver", type: "bytes" },
              { name: "validAt", type: "uint40" },
              { name: "validUntil", type: "uint40" },
              { name: "interfaceId", type: "bytes4" },
              { name: "data", type: "bytes" },
            ],
          },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getAssociationsForAccount",
    stateMutability: "view",
    inputs: [{ name: "account", type: "bytes" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "revokedAt", type: "uint40" },
          { name: "initiatorKeyType", type: "bytes2" },
          { name: "approverKeyType", type: "bytes2" },
          { name: "initiatorSignature", type: "bytes" },
          { name: "approverSignature", type: "bytes" },
          {
            name: "record",
            type: "tuple",
            components: [
              { name: "initiator", type: "bytes" },
              { name: "approver", type: "bytes" },
              { name: "validAt", type: "uint40" },
              { name: "validUntil", type: "uint40" },
              { name: "interfaceId", type: "bytes4" },
              { name: "data", type: "bytes" },
            ],
          },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getActiveAssociationsForAccount",
    stateMutability: "view",
    inputs: [{ name: "account", type: "bytes" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "revokedAt", type: "uint40" },
          { name: "initiatorKeyType", type: "bytes2" },
          { name: "approverKeyType", type: "bytes2" },
          { name: "initiatorSignature", type: "bytes" },
          { name: "approverSignature", type: "bytes" },
          {
            name: "record",
            type: "tuple",
            components: [
              { name: "initiator", type: "bytes" },
              { name: "approver", type: "bytes" },
              { name: "validAt", type: "uint40" },
              { name: "validUntil", type: "uint40" },
              { name: "interfaceId", type: "bytes4" },
              { name: "data", type: "bytes" },
            ],
          },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "isValid",
    stateMutability: "view",
    inputs: [{ name: "hash", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "areAccountsAssociated",
    stateMutability: "view",
    inputs: [
      { name: "account1", type: "bytes" },
      { name: "account2", type: "bytes" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },

  // Events
  {
    type: "event",
    name: "AssociationCreated",
    inputs: [
      { name: "hash", type: "bytes32", indexed: true },
      { name: "initiator", type: "bytes32", indexed: true },
      { name: "approver", type: "bytes32", indexed: true },
      {
        name: "sar",
        type: "tuple",
        indexed: false,
        components: [
          { name: "revokedAt", type: "uint40" },
          { name: "initiatorKeyType", type: "bytes2" },
          { name: "approverKeyType", type: "bytes2" },
          { name: "initiatorSignature", type: "bytes" },
          { name: "approverSignature", type: "bytes" },
          {
            name: "record",
            type: "tuple",
            components: [
              { name: "initiator", type: "bytes" },
              { name: "approver", type: "bytes" },
              { name: "validAt", type: "uint40" },
              { name: "validUntil", type: "uint40" },
              { name: "interfaceId", type: "bytes4" },
              { name: "data", type: "bytes" },
            ],
          },
        ],
      },
    ],
  },
  {
    type: "event",
    name: "AssociationRevoked",
    inputs: [
      { name: "hash", type: "bytes32", indexed: true },
      { name: "revokedBy", type: "bytes32", indexed: true },
      { name: "revokedAt", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ProposalCreated",
    inputs: [
      { name: "hash", type: "bytes32", indexed: true },
      { name: "approver", type: "bytes32", indexed: true },
      {
        name: "aar",
        type: "tuple",
        indexed: false,
        components: [
          { name: "initiator", type: "bytes" },
          { name: "approver", type: "bytes" },
          { name: "validAt", type: "uint40" },
          { name: "validUntil", type: "uint40" },
          { name: "interfaceId", type: "bytes4" },
          { name: "data", type: "bytes" },
        ],
      },
    ],
  },
  {
    type: "event",
    name: "ProposalAccepted",
    inputs: [
      { name: "hash", type: "bytes32", indexed: true },
      { name: "approver", type: "bytes32", indexed: true },
    ],
  },
  {
    type: "event",
    name: "ProposalRejected",
    inputs: [
      { name: "hash", type: "bytes32", indexed: true },
      { name: "approver", type: "bytes32", indexed: true },
    ],
  },

  // Errors
  {
    type: "error",
    name: "AssociationNotFound",
    inputs: [],
  },
  {
    type: "error",
    name: "ProposalNotFound",
    inputs: [],
  },
  {
    type: "error",
    name: "ProposalAlreadyExists",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidSignature",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidTimestamps",
    inputs: [],
  },
  {
    type: "error",
    name: "NotAuthorized",
    inputs: [],
  },
  {
    type: "error",
    name: "AlreadyRevoked",
    inputs: [],
  },
  {
    type: "error",
    name: "UnsupportedKeyType",
    inputs: [{ name: "keyType", type: "bytes2" }],
  },
  {
    type: "error",
    name: "UnsupportedChainType",
    inputs: [{ name: "chainType", type: "bytes2" }],
  },
] as const satisfies Abi;
