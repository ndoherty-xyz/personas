export { AssociationsClient } from "./client/AssociationsClient";
export type { AssociationsClientConfig } from "./client/AssociationsClient";

export type {
  AssociatedAccountRecord,
  SignedAssociationRecord,
  PendingProposal,
  KeyTypeValue,
  ProposalStatus,
  AssociationQueryOptions,
  ProposalQueryOptions,
  NetworkConfig,
  EthereumAddress,
  Hex,
} from "./types";

export { KeyType } from "./types";

export {
  CONTRACT_ADDRESSES,
  CHAIN_CONFIG,
  PERSONAS_ABI,
  SUBGRAPH_URLS,
} from "./constants";

export {
  formatERC7930Address,
  hashERC7930Address,
  hashAAR,
  getEIP712Domain,
  getEIP712TypedData,
  isAssociationValid,
  detectKeyType,
} from "./utils";

export * from "./queries";
