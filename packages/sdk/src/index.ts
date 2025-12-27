export { AssociationsClient } from "./client/AssociationsClient";
export type { AssociationsClientConfig } from "./client/AssociationsClient";

export type {
  Address,
  AssociatedAccountRecord,
  SignatureData,
  SignedAssociationRecord,
  KeyTypeValue,
  AssociationQueryOptions,
  NetworkConfig,
  EthereumAddress,
  Hex,
} from "./types";

export { KeyType } from "./types";

export {
  CONTRACT_ADDRESSES,
  CHAIN_CONFIG,
  ASSOCIATED_ACCOUNTS_ABI,
} from "./constants";

export {
  hashAddress,
  hashAAR,
  getEIP712Domain,
  getEIP712TypedData,
  isAssociationValid,
  detectKeyType,
} from "./utils";

export * from "./queries";
