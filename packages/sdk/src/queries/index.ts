import type { Address } from '../types';

export interface QueryOptions {
  activeOnly?: boolean;
  asInitiator?: boolean;
  asApprover?: boolean;
  interfaceId?: string;
  first?: number;
  skip?: number;
}

export interface AssociationQueryResult {
  id: string;
  initiatorHash: string;
  approverHash: string;
  initiator: string;
  approver: string;
  validAt: string;
  validUntil: string;
  interfaceId: string;
  data: string;
  revokedAt: string;
  revokedBy: string | null;
  createdAt: string;
  createdTx: string;
  initiatorKeyType: string;
  approverKeyType: string;
}

export interface AccountQueryResult {
  id: string;
  address: string;
  totalAssociations: string;
  activeAssociations: string;
}

export interface GlobalStatsResult {
  totalAssociations: string;
  totalRevocations: string;
  totalAccounts: string;
  lastUpdated: string;
}

export function buildAssociationsQuery(
  addressHash: string,
  options: QueryOptions = {}
): string {
  const {
    activeOnly = false,
    asInitiator,
    asApprover,
    interfaceId,
    first = 100,
    skip = 0,
  } = options;

  let whereClause = '';
  const conditions: string[] = [];

  if (asInitiator !== undefined) {
    if (asInitiator) {
      conditions.push(`initiatorHash: "${addressHash}"`);
    }
  }

  if (asApprover !== undefined) {
    if (asApprover) {
      conditions.push(`approverHash: "${addressHash}"`);
    }
  }

  if (asInitiator === undefined && asApprover === undefined) {
    conditions.push(`or: [
      { initiatorHash: "${addressHash}" }
      { approverHash: "${addressHash}" }
    ]`);
  }

  if (activeOnly) {
    conditions.push('revokedAt: "0"');
  }

  if (interfaceId) {
    conditions.push(`interfaceId: "${interfaceId}"`);
  }

  if (conditions.length > 0) {
    whereClause = `where: { ${conditions.join(', ')} }`;
  }

  return `
    query {
      associations(
        ${whereClause}
        first: ${first}
        skip: ${skip}
        orderBy: createdAt
        orderDirection: desc
      ) {
        id
        initiatorHash
        approverHash
        initiator
        approver
        validAt
        validUntil
        interfaceId
        data
        revokedAt
        revokedBy
        createdAt
        createdTx
        initiatorKeyType
        approverKeyType
      }
    }
  `;
}

export function buildAssociationByIdQuery(id: string): string {
  return `
    query {
      association(id: "${id}") {
        id
        initiatorHash
        approverHash
        initiator
        approver
        validAt
        validUntil
        interfaceId
        data
        revokedAt
        revokedBy
        createdAt
        createdTx
        initiatorKeyType
        approverKeyType
      }
    }
  `;
}

export function buildAccountQuery(addressHash: string): string {
  return `
    query {
      account(id: "${addressHash}") {
        id
        address
        totalAssociations
        activeAssociations
      }
    }
  `;
}

export function buildGlobalStatsQuery(): string {
  return `
    query {
      globalStats(id: "global") {
        totalAssociations
        totalRevocations
        totalAccounts
        lastUpdated
      }
    }
  `;
}