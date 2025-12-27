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
  buildAssociationByIdQuery,
  buildAccountQuery,
  buildGlobalStatsQuery,
  type QueryOptions,
  type AssociationQueryResult,
  type AccountQueryResult,
  type GlobalStatsResult,
} from "../queries";
import { SUBGRAPH_URLS } from "../constants";

import type {
  AssociatedAccountRecord,
  SignedAssociationRecord,
  SignatureData,
  Address,
  EthereumAddress,
  AssociationQueryOptions,
} from "../types";
import { CONTRACT_ADDRESSES, ASSOCIATED_ACCOUNTS_ABI } from "../constants";
import {
  hashAddress,
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

  async createAssociation(params: {
    initiator: EthereumAddress;
    approver: EthereumAddress;
    validAt?: bigint;
    validUntil?: bigint;
    interfaceId?: Hex;
    data?: Hex;
  }): Promise<AssociatedAccountRecord> {
    const initiatorKeyType = await detectKeyType(
      params.initiator,
      this.publicClient
    );
    const approverKeyType = await detectKeyType(
      params.approver,
      this.publicClient
    );

    const initiatorAddr: Address = {
      addressHash: hashAddress(params.initiator),
      keyType: initiatorKeyType,
    };

    const approverAddr: Address = {
      addressHash: hashAddress(params.approver),
      keyType: approverKeyType,
    };

    return {
      initiator: initiatorAddr,
      approver: approverAddr,
      validAt: params.validAt ?? BigInt(Math.floor(Date.now() / 1000)),
      validUntil: params.validUntil ?? 0n,
      interfaceId: params.interfaceId ?? "0x00000000",
      data: params.data ?? "0x",
    };
  }

  async signAssociation(
    aar: AssociatedAccountRecord,
    walletClient?: WalletClient
  ): Promise<SignatureData> {
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

    return {
      keyType,
      signature,
    };
  }

  buildSignedRecord(
    aar: AssociatedAccountRecord,
    initiatorSignature: SignatureData,
    approverSignature: SignatureData
  ): SignedAssociationRecord {
    return {
      aar,
      initiatorSignature,
      approverSignature,
      revokedAt: 0n,
    };
  }

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
      abi: ASSOCIATED_ACCOUNTS_ABI,
      functionName: "registerAssociation",
      args: [sar],
      account: client.account,
      chain: this.chain,
    });

    return hash;
  }

  async revokeAssociation(
    hash: Hex,
    revokedAt?: bigint,
    walletClient?: WalletClient
  ): Promise<Hex> {
    const client = walletClient ?? this.walletClient;

    if (!client) {
      throw new Error("No wallet client provided");
    }

    if (!client.account) {
      throw new Error("Wallet client has no account");
    }

    const timestamp = revokedAt ?? BigInt(Math.floor(Date.now() / 1000));

    const txHash = await client.writeContract({
      address: this.contractAddress,
      abi: ASSOCIATED_ACCOUNTS_ABI,
      functionName: "revokeAssociation",
      args: [hash, timestamp],
      account: client.account,
      chain: this.chain,
    });

    return txHash;
  }

  /**
   * Get a single association by its hash
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

  async validateAssociation(sar: SignedAssociationRecord): Promise<boolean> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: ASSOCIATED_ACCOUNTS_ABI,
      functionName: "validateAssociation",
      args: [sar],
    });

    return result as boolean;
  }

  isValid(sar: SignedAssociationRecord, timestamp?: bigint): boolean {
    return isAssociationValid(sar, timestamp);
  }

  computeHash(aar: AssociatedAccountRecord): Hex {
    return hashAAR(aar);
  }

  /**
   * Query associations for an address from the subgraph
   */
  async getAssociationsForAddress(
    address: EthereumAddress,
    options?: QueryOptions
  ): Promise<AssociationQueryResult[]> {
    const addressHash = hashAddress(address);
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
   * Get account stats for an address
   */
  async getAccountStats(
    address: EthereumAddress
  ): Promise<AccountQueryResult | null> {
    const addressHash = hashAddress(address);
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
