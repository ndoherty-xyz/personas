import fetch from "cross-fetch";
import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Hex,
  type Chain,
} from "viem";
import { baseSepolia } from "viem/chains";

import {
  buildAssociationsQuery,
  buildProposalsQuery,
  buildAssociationByIdQuery,
  buildProposalByIdQuery,
  buildAccountQuery,
  buildGlobalStatsQuery,
  type QueryOptions,
  type ProposalQueryOptions,
  type AssociationQueryResult,
  type ProposalQueryResult,
  type AccountQueryResult,
  type GlobalStatsResult,
} from "../queries";
import { SUBGRAPH_URLS, PERSONAS_ABI, CONTRACT_ADDRESSES } from "../constants";

import type {
  AssociatedAccountRecord,
  SignedAssociationRecord,
  PendingProposal,
  EthereumAddress,
} from "../types";

import {
  formatERC7930Address,
  hashERC7930Address,
  hashAAR,
  getEIP712TypedData,
  isAssociationValid,
  detectKeyType,
} from "../utils";

export type AssociationsClientConfig = {
  chainId?: number;
  contractAddress?: EthereumAddress;
  publicClient?: PublicClient;
  walletClient?: WalletClient;
  subgraphUrl?: string;
};

export class AssociationsClient {
  private publicClient: PublicClient;
  private walletClient?: WalletClient;
  private chain: Chain;
  private chainId: number;
  private contractAddress: EthereumAddress;
  private subgraphUrl: string;

  constructor(config: AssociationsClientConfig = {}) {
    this.chainId = config.chainId ?? 84532;
    this.chain = baseSepolia; // TODO: Support other chains based on chainId
    this.contractAddress =
      config.contractAddress ?? CONTRACT_ADDRESSES[this.chainId];

    this.subgraphUrl =
      config.subgraphUrl ||
      SUBGRAPH_URLS[this.chainId as keyof typeof SUBGRAPH_URLS] ||
      SUBGRAPH_URLS["base-sepolia"];

    if (!this.contractAddress) {
      throw new Error(`No contract address found for chainId ${this.chainId}`);
    }

    this.publicClient =
      config.publicClient ??
      (createPublicClient({
        chain: this.chain,
        transport: http(),
      }) as PublicClient);

    this.walletClient = config.walletClient;
  }

  // ===== ASSOCIATION CREATION (AAR) =====

  /**
   * Create an unsigned AssociatedAccountRecord
   * Formats ethereum addresses as ERC-7930 interoperable addresses
   */
  async createAssociation(params: {
    initiator: EthereumAddress;
    approver: EthereumAddress;
    validAt?: number;
    validUntil?: number;
    interfaceId?: Hex;
    data?: Hex;
  }): Promise<AssociatedAccountRecord> {
    const initiatorAddr = formatERC7930Address(this.chainId, params.initiator);
    const approverAddr = formatERC7930Address(this.chainId, params.approver);

    return {
      initiator: initiatorAddr,
      approver: approverAddr,
      validAt: params.validAt ?? Math.floor(Date.now() / 1000),
      validUntil: params.validUntil ?? 0,
      interfaceId: params.interfaceId ?? "0x00000000",
      data: params.data ?? "0x",
    };
  }

  /**
   * Sign an AssociatedAccountRecord using EIP-712
   * Returns signature and detected key type
   */
  async signAssociation(
    aar: AssociatedAccountRecord,
    walletClient?: WalletClient
  ): Promise<{ signature: Hex; keyType: Hex }> {
    const client = walletClient ?? this.walletClient;

    if (!client) {
      throw new Error("No wallet client provided");
    }

    if (!client.account) {
      throw new Error("Wallet client has no account");
    }

    const typedData = getEIP712TypedData(
      aar,
      this.chainId,
      this.contractAddress
    );

    const signature = await client.signTypedData({
      ...typedData,
      account: client.account,
    });

    const keyType = await detectKeyType(
      client.account.address,
      this.publicClient
    );

    return { signature, keyType };
  }

  /**
   * Build a complete SignedAssociationRecord from AAR and both signatures
   * For direct registration flow (skip proposal)
   */
  buildSignedRecord(
    aar: AssociatedAccountRecord,
    initiatorSignature: Hex,
    initiatorKeyType: Hex,
    approverSignature: Hex,
    approverKeyType: Hex
  ): SignedAssociationRecord {
    return {
      revokedAt: 0,
      initiatorKeyType,
      approverKeyType,
      initiatorSignature,
      approverSignature,
      record: aar,
    };
  }

  // ===== DIRECT REGISTRATION FLOW =====

  /**
   * Register a complete association directly (both parties signed offchain)
   * Returns transaction hash
   */
  async registerAssociation(
    sar: SignedAssociationRecord,
    walletClient?: WalletClient
  ): Promise<Hex> {
    const client = walletClient ?? this.walletClient;

    if (!client) {
      throw new Error("No wallet client provided");
    }

    if (!client.account) {
      throw new Error("Wallet client has no account");
    }

    const hash = await client.writeContract({
      address: this.contractAddress,
      abi: PERSONAS_ABI,
      functionName: "registerAssociation",
      args: [sar],
      account: client.account,
      chain: this.chain,
    });

    return hash;
  }

  // ===== PROPOSAL FLOW =====

  /**
   * Propose an association (initiator creates and signs)
   * Returns transaction hash
   */
  async proposeAssociation(
    aar: AssociatedAccountRecord,
    signature: Hex,
    keyType: Hex,
    walletClient?: WalletClient
  ): Promise<Hex> {
    const client = walletClient ?? this.walletClient;

    if (!client) {
      throw new Error("No wallet client provided");
    }

    if (!client.account) {
      throw new Error("Wallet client has no account");
    }

    const txHash = await client.writeContract({
      address: this.contractAddress,
      abi: PERSONAS_ABI,
      functionName: "proposeAssociation",
      args: [aar, signature, keyType],
      account: client.account,
      chain: this.chain,
    });

    return txHash;
  }

  /**
   * Accept a pending proposal (approver signs and completes)
   * Returns transaction hash
   */
  async acceptProposal(
    proposalHash: Hex,
    signature: Hex,
    keyType: Hex,
    walletClient?: WalletClient
  ): Promise<Hex> {
    const client = walletClient ?? this.walletClient;

    if (!client) {
      throw new Error("No wallet client provided");
    }

    if (!client.account) {
      throw new Error("Wallet client has no account");
    }

    const txHash = await client.writeContract({
      address: this.contractAddress,
      abi: PERSONAS_ABI,
      functionName: "acceptProposal",
      args: [proposalHash, signature, keyType],
      account: client.account,
      chain: this.chain,
    });

    return txHash;
  }

  /**
   * Reject a pending proposal
   * Returns transaction hash
   */
  async rejectProposal(
    proposalHash: Hex,
    walletClient?: WalletClient
  ): Promise<Hex> {
    const client = walletClient ?? this.walletClient;

    if (!client) {
      throw new Error("No wallet client provided");
    }

    if (!client.account) {
      throw new Error("Wallet client has no account");
    }

    const txHash = await client.writeContract({
      address: this.contractAddress,
      abi: PERSONAS_ABI,
      functionName: "rejectProposal",
      args: [proposalHash],
      account: client.account,
      chain: this.chain,
    });

    return txHash;
  }

  // ===== REVOCATION =====

  /**
   * Revoke an association
   * Either party can revoke, optionally backdating the revocation
   */
  async revokeAssociation(
    hash: Hex,
    revokedAt?: number,
    walletClient?: WalletClient
  ): Promise<Hex> {
    const client = walletClient ?? this.walletClient;

    if (!client) {
      throw new Error("No wallet client provided");
    }

    if (!client.account) {
      throw new Error("Wallet client has no account");
    }

    // Default to current timestamp if not specified
    const timestamp = revokedAt ?? Math.floor(Date.now() / 1000);

    const txHash = await client.writeContract({
      address: this.contractAddress,
      abi: PERSONAS_ABI,
      functionName: "revokeAssociation",
      args: [hash, timestamp],
      account: client.account,
      chain: this.chain,
    });

    return txHash;
  }

  // ===== CONTRACT READ FUNCTIONS =====

  /**
   * Get a proposal from the contract by hash
   * Returns null if proposal doesn't exist
   */
  async getProposalFromContract(hash: Hex): Promise<PendingProposal | null> {
    const proposal = (await this.publicClient.readContract({
      address: this.contractAddress,
      abi: PERSONAS_ABI,
      functionName: "getProposal",
      args: [hash],
    })) as PendingProposal;

    return proposal.exists ? proposal : null;
  }

  /**
   * Get pending proposal hashes for an address (from contract)
   * Returns array of proposal hashes
   */
  async getPendingProposalHashes(
    approverAddress: EthereumAddress
  ): Promise<Hex[]> {
    const approverAddr = formatERC7930Address(this.chainId, approverAddress);

    const hashes = (await this.publicClient.readContract({
      address: this.contractAddress,
      abi: PERSONAS_ABI,
      functionName: "getPendingProposals",
      args: [approverAddr],
    })) as Hex[];

    return hashes;
  }

  /**
   * Get an association from the contract by hash
   */
  async getAssociationFromContract(
    hash: Hex
  ): Promise<SignedAssociationRecord> {
    const sar = (await this.publicClient.readContract({
      address: this.contractAddress,
      abi: PERSONAS_ABI,
      functionName: "getAssociation",
      args: [hash],
    })) as SignedAssociationRecord;

    return sar;
  }

  /**
   * Check if an association is valid on-chain
   */
  async isValidOnChain(hash: Hex): Promise<boolean> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: PERSONAS_ABI,
      functionName: "isValid",
      args: [hash],
    });

    return result as boolean;
  }

  /**
   * Check if two accounts are associated
   */
  async areAccountsAssociated(
    account1: EthereumAddress,
    account2: EthereumAddress
  ): Promise<boolean> {
    const addr1 = formatERC7930Address(this.chainId, account1);
    const addr2 = formatERC7930Address(this.chainId, account2);

    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: PERSONAS_ABI,
      functionName: "areAccountsAssociated",
      args: [addr1, addr2],
    });

    return result as boolean;
  }

  // ===== LOCAL VALIDATION =====

  /**
   * Validate an association locally (checks timestamps and revocation)
   * Does not verify signatures - use contract's isValid for full validation
   */
  isValid(sar: SignedAssociationRecord, timestamp?: number): boolean {
    return isAssociationValid(sar, timestamp);
  }

  /**
   * Compute the hash of an AAR
   * This is the unique identifier used for storage/lookups
   */
  computeHash(aar: AssociatedAccountRecord): Hex {
    return hashAAR(aar);
  }

  // ===== SUBGRAPH QUERIES =====

  /**
   * Query associations for an address from the subgraph
   * Much faster than contract reads for bulk queries
   */
  async getAssociationsForAddress(
    address: EthereumAddress,
    options?: QueryOptions
  ): Promise<AssociationQueryResult[]> {
    const addr = formatERC7930Address(this.chainId, address);
    const addressHash = hashERC7930Address(addr);
    const query = buildAssociationsQuery(addressHash, options);

    const response = await fetch(this.subgraphUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();
    return result.data?.associations || [];
  }

  /**
   * Query proposals for an address from the subgraph
   */
  async getProposalsForAddress(
    address: EthereumAddress,
    options?: ProposalQueryOptions
  ): Promise<ProposalQueryResult[]> {
    const addr = formatERC7930Address(this.chainId, address);
    const addressHash = hashERC7930Address(addr);
    const query = buildProposalsQuery(addressHash, options);

    const response = await fetch(this.subgraphUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();
    return result.data?.proposals || [];
  }

  /**
   * Get a single association by hash from subgraph
   */
  async getAssociation(hash: string): Promise<AssociationQueryResult | null> {
    const query = buildAssociationByIdQuery(hash);

    const response = await fetch(this.subgraphUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();
    return result.data?.association || null;
  }

  /**
   * Get a single proposal by hash from subgraph
   */
  async getProposal(hash: string): Promise<ProposalQueryResult | null> {
    const query = buildProposalByIdQuery(hash);

    const response = await fetch(this.subgraphUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();
    return result.data?.proposal || null;
  }

  /**
   * Get account stats for an address
   */
  async getAccountStats(
    address: EthereumAddress
  ): Promise<AccountQueryResult | null> {
    const addr = formatERC7930Address(this.chainId, address);
    const addressHash = hashERC7930Address(addr);
    const query = buildAccountQuery(addressHash);

    const response = await fetch(this.subgraphUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();
    return result.data?.account || null;
  }

  /**
   * Get global protocol stats
   */
  async getGlobalStats(): Promise<GlobalStatsResult | null> {
    const query = buildGlobalStatsQuery();

    const response = await fetch(this.subgraphUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();
    return result.data?.globalStats || null;
  }
}
