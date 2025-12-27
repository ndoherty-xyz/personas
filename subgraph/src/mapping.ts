import {
  BigInt,
  Bytes,
  log,
  ByteArray,
  Wrapped,
} from "@graphprotocol/graph-ts";
import {
  AssociationCreated as AssociationCreatedEvent,
  AssociationRevoked as AssociationRevokedEvent,
} from "../generated/AssociatedAccounts/AssociatedAccounts";
import { Association, Account, GlobalStats } from "../generated/schema";

function parseEthereumAddress(addressBytes: Bytes): Bytes | null {
  if (addressBytes.length < 6) {
    return null;
  }

  // check version (0x0001) and chain type (0x0000)
  if (
    addressBytes[0] != 0x00 ||
    addressBytes[1] != 0x01 ||
    addressBytes[2] != 0x00 ||
    addressBytes[3] != 0x00
  ) {
    return null;
  }

  let chainRefLen = addressBytes[4];
  let addrLenPos = 5 + chainRefLen;

  if (addressBytes.length <= addrLenPos) {
    return null;
  }

  let addrLen = addressBytes[addrLenPos];
  if (addrLen != 20) {
    return null;
  }

  let startPos = addrLenPos + 1;
  let endPos = startPos + 20;

  if (addressBytes.length < endPos) {
    return null;
  }

  // manually copy 20 bytes
  let result = new ByteArray(20);
  for (let i = 0; i < 20; i++) {
    result[i] = addressBytes[startPos + i];
  }

  return changetype<Bytes>(result);
}

export function handleAssociationCreated(event: AssociationCreatedEvent): void {
  log.info("Processing AssociationCreated for hash: {}", [
    event.params.hash.toHex(),
  ]);

  let association = new Association(event.params.hash.toHex());
  association.initiatorHash = event.params.initiator;
  association.approverHash = event.params.approver;

  // parse EVM addresses from ERC-7930 format
  let initiatorAddr = parseEthereumAddress(event.params.sar.record.initiator);
  let approverAddr = parseEthereumAddress(event.params.sar.record.approver);

  association.initiator = initiatorAddr
    ? initiatorAddr
    : event.params.sar.record.initiator;
  association.approver = approverAddr
    ? approverAddr
    : event.params.sar.record.approver;

  association.validAt = event.params.sar.record.validAt;
  association.validUntil = event.params.sar.record.validUntil;
  association.interfaceId = event.params.sar.record.interfaceId;
  association.data = event.params.sar.record.data;
  association.initiatorKeyType = event.params.sar.initiatorKeyType;
  association.approverKeyType = event.params.sar.approverKeyType;
  association.revokedAt = event.params.sar.revokedAt;
  association.revokedBy = null;
  association.createdAt = event.block.timestamp;
  association.createdTx = event.transaction.hash;

  let initiatorAccount = getOrCreateAccount(
    event.params.initiator,
    initiatorAddr ? initiatorAddr : event.params.sar.record.initiator
  );
  let approverAccount = getOrCreateAccount(
    event.params.approver,
    approverAddr ? approverAddr : event.params.sar.record.approver
  );

  association.initiatorAccount = initiatorAccount.id;
  association.approverAccount = approverAccount.id;

  association.save();

  initiatorAccount.totalAssociations = initiatorAccount.totalAssociations.plus(
    BigInt.fromI32(1)
  );
  initiatorAccount.activeAssociations =
    initiatorAccount.activeAssociations.plus(BigInt.fromI32(1));
  initiatorAccount.save();

  approverAccount.totalAssociations = approverAccount.totalAssociations.plus(
    BigInt.fromI32(1)
  );
  approverAccount.activeAssociations = approverAccount.activeAssociations.plus(
    BigInt.fromI32(1)
  );
  approverAccount.save();

  updateGlobalStats(event.block.timestamp);

  log.info("Association created successfully", []);
}

export function handleAssociationRevoked(event: AssociationRevokedEvent): void {
  let association = Association.load(event.params.hash.toHex());

  if (association) {
    association.revokedAt = event.params.revokedAt;
    association.revokedBy = event.params.revokedBy;
    association.save();

    let initiatorAccount = Account.load(association.initiatorAccount);
    if (initiatorAccount) {
      initiatorAccount.activeAssociations =
        initiatorAccount.activeAssociations.minus(BigInt.fromI32(1));
      initiatorAccount.save();
    }

    let approverAccount = Account.load(association.approverAccount);
    if (approverAccount) {
      approverAccount.activeAssociations =
        approverAccount.activeAssociations.minus(BigInt.fromI32(1));
      approverAccount.save();
    }

    let stats = getOrCreateGlobalStats();
    stats.totalRevocations = stats.totalRevocations.plus(BigInt.fromI32(1));
    stats.lastUpdated = event.block.timestamp;
    stats.save();
  }
}

function getOrCreateAccount(addressHash: Bytes, address: Bytes): Account {
  let account = Account.load(addressHash.toHex());

  if (account == null) {
    account = new Account(addressHash.toHex());
    account.address = address;
    account.totalAssociations = BigInt.fromI32(0);
    account.activeAssociations = BigInt.fromI32(0);
    account.save();

    let stats = getOrCreateGlobalStats();
    stats.totalAccounts = stats.totalAccounts.plus(BigInt.fromI32(1));
    stats.save();
  }

  return account;
}

function updateGlobalStats(timestamp: BigInt): void {
  let stats = getOrCreateGlobalStats();
  stats.totalAssociations = stats.totalAssociations.plus(BigInt.fromI32(1));
  stats.lastUpdated = timestamp;
  stats.save();
}

function getOrCreateGlobalStats(): GlobalStats {
  let stats = GlobalStats.load("global");

  if (stats == null) {
    stats = new GlobalStats("global");
    stats.totalAssociations = BigInt.fromI32(0);
    stats.totalRevocations = BigInt.fromI32(0);
    stats.totalAccounts = BigInt.fromI32(0);
    stats.lastUpdated = BigInt.fromI32(0);
  }

  return stats;
}
