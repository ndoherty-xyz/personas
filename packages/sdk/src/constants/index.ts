import type { Abi } from "viem";
import type { EthereumAddress } from "../types";

/**
 * Deployed contract addresses by chain ID
 */
export const CONTRACT_ADDRESSES: Record<number, EthereumAddress> = {
  84532: "0x6f4D643BD9332d9Aa3a828576e3a64ccc58D2684",
};

/**
 * Chain configurations
 */
export const CHAIN_CONFIG = {
  baseSepolia: {
    chainId: 84532,
    name: "Base Sepolia",
    contractAddress: CONTRACT_ADDRESSES[84532],
    subgraphUrl: "",
  },
} as const;

/**
 * AssociatedAccounts contract ABI
 * Based on ERC-8092 standard
 */
export const ASSOCIATED_ACCOUNTS_ABI = [
  // Events
  {
    type: "event",
    name: "AssociationCreated",
    inputs: [
      { name: "hash", type: "bytes32", indexed: true },
      { name: "initiator", type: "bytes32", indexed: true },
      { name: "approver", type: "bytes32", indexed: true },
      { name: "validAt", type: "uint256", indexed: false },
      { name: "validUntil", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "AssociationRevoked",
    inputs: [
      { name: "hash", type: "bytes32", indexed: true },
      { name: "revokedBy", type: "address", indexed: true },
      { name: "revokedAt", type: "uint256", indexed: false },
    ],
  },

  // Functions
  {
    type: "function",
    name: "registerAssociation",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "sar",
        type: "tuple",
        components: [
          {
            name: "aar",
            type: "tuple",
            components: [
              {
                name: "initiator",
                type: "tuple",
                components: [
                  { name: "addressHash", type: "bytes32" },
                  { name: "keyType", type: "bytes1" },
                ],
              },
              {
                name: "approver",
                type: "tuple",
                components: [
                  { name: "addressHash", type: "bytes32" },
                  { name: "keyType", type: "bytes1" },
                ],
              },
              { name: "validAt", type: "uint256" },
              { name: "validUntil", type: "uint256" },
              { name: "interfaceId", type: "bytes4" },
              { name: "data", type: "bytes" },
            ],
          },
          {
            name: "initiatorSignature",
            type: "tuple",
            components: [
              { name: "keyType", type: "bytes1" },
              { name: "signature", type: "bytes" },
            ],
          },
          {
            name: "approverSignature",
            type: "tuple",
            components: [
              { name: "keyType", type: "bytes1" },
              { name: "signature", type: "bytes" },
            ],
          },
          { name: "revokedAt", type: "uint256" },
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
      { name: "revokedAt", type: "uint256" },
    ],
    outputs: [],
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
          {
            name: "aar",
            type: "tuple",
            components: [
              {
                name: "initiator",
                type: "tuple",
                components: [
                  { name: "addressHash", type: "bytes32" },
                  { name: "keyType", type: "bytes1" },
                ],
              },
              {
                name: "approver",
                type: "tuple",
                components: [
                  { name: "addressHash", type: "bytes32" },
                  { name: "keyType", type: "bytes1" },
                ],
              },
              { name: "validAt", type: "uint256" },
              { name: "validUntil", type: "uint256" },
              { name: "interfaceId", type: "bytes4" },
              { name: "data", type: "bytes" },
            ],
          },
          {
            name: "initiatorSignature",
            type: "tuple",
            components: [
              { name: "keyType", type: "bytes1" },
              { name: "signature", type: "bytes" },
            ],
          },
          {
            name: "approverSignature",
            type: "tuple",
            components: [
              { name: "keyType", type: "bytes1" },
              { name: "signature", type: "bytes" },
            ],
          },
          { name: "revokedAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "validateAssociation",
    stateMutability: "view",
    inputs: [
      {
        name: "sar",
        type: "tuple",
        components: [
          {
            name: "aar",
            type: "tuple",
            components: [
              {
                name: "initiator",
                type: "tuple",
                components: [
                  { name: "addressHash", type: "bytes32" },
                  { name: "keyType", type: "bytes1" },
                ],
              },
              {
                name: "approver",
                type: "tuple",
                components: [
                  { name: "addressHash", type: "bytes32" },
                  { name: "keyType", type: "bytes1" },
                ],
              },
              { name: "validAt", type: "uint256" },
              { name: "validUntil", type: "uint256" },
              { name: "interfaceId", type: "bytes4" },
              { name: "data", type: "bytes" },
            ],
          },
          {
            name: "initiatorSignature",
            type: "tuple",
            components: [
              { name: "keyType", type: "bytes1" },
              { name: "signature", type: "bytes" },
            ],
          },
          {
            name: "approverSignature",
            type: "tuple",
            components: [
              { name: "keyType", type: "bytes1" },
              { name: "signature", type: "bytes" },
            ],
          },
          { name: "revokedAt", type: "uint256" },
        ],
      },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const satisfies Abi;

export const SUBGRAPH_URLS = {
  "base-sepolia":
    "https://api.studio.thegraph.com/query/45616/erc-8092-associations/v0.0.7",
  84532:
    "https://api.studio.thegraph.com/query/45616/erc-8092-associations/v0.0.7",
} as const;
