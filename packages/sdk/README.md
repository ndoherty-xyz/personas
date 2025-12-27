# @erc8092/sdk

TypeScript SDK for ERC-8092 Associated Accounts standard.

## Installation

```bash
pnpm add @erc8092/sdk viem
```

## Quick Start

```typescript
import { AssociationsClient } from "@erc8092/sdk";
import { createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// create client
const client = new AssociationsClient({
  chainId: 84532, // base sepolia
});

// create association
const aar = await client.createAssociation({
  initiator: "0xAlice...",
  approver: "0xBob...",
});

// sign with wallet
const aliceWallet = createWalletClient({
  account: privateKeyToAccount("0x..."),
  chain: baseSepolia,
  transport: http(),
});

const signature = await client.signAssociation(aar, aliceWallet);
```

## API Reference

### AssociationsClient

#### Constructor

```typescript
new AssociationsClient(config?: AssociationsClientConfig)
```

**Config:**

- `chainId?: number` - defaults to 84532 (base sepolia)
- `contractAddress?: Address` - override contract address
- `publicClient?: PublicClient` - custom viem public client
- `walletClient?: WalletClient` - default wallet for transactions
- `subgraphUrl?: string` - subgraph endpoint (coming soon)

#### Methods

**createAssociation**

```typescript
async createAssociation(params: {
  initiator: Address
  approver: Address
  validAt?: bigint
  validUntil?: bigint
  interfaceId?: Hex
  data?: Hex
}): Promise<AssociatedAccountRecord>
```

Creates an unsigned association record.

**signAssociation**

```typescript
async signAssociation(
  aar: AssociatedAccountRecord,
  walletClient?: WalletClient
): Promise<SignatureData>
```

Signs an AAR using EIP-712 structured data.

**buildSignedRecord**

```typescript
buildSignedRecord(
  aar: AssociatedAccountRecord,
  initiatorSignature: SignatureData,
  approverSignature: SignatureData
): SignedAssociationRecord
```

Combines AAR and signatures into a complete SAR.

**registerAssociation**

```typescript
async registerAssociation(
  sar: SignedAssociationRecord,
  walletClient?: WalletClient
): Promise<Hex>
```

Submits association to blockchain. Returns transaction hash.

**revokeAssociation**

```typescript
async revokeAssociation(
  hash: Hex,
  revokedAt?: bigint,
  walletClient?: WalletClient
): Promise<Hex>
```

Revokes an association. Either party can revoke.

**getAssociation**

```typescript
async getAssociation(hash: Hex): Promise<SignedAssociationRecord>
```

Reads association from blockchain by hash.

**validateAssociation**

```typescript
async validateAssociation(sar: SignedAssociationRecord): Promise<boolean>
```

Validates association onchain (checks signatures, timestamps, revocation).

**isValid**

```typescript
isValid(sar: SignedAssociationRecord, timestamp?: bigint): boolean
```

Local validation (timestamps and revocation only, no signature verification).

**computeHash**

```typescript
computeHash(aar: AssociatedAccountRecord): Hex
```

Computes the hash of an AAR (used for revocation and lookups).

## Full Example

```typescript
import { AssociationsClient } from "@erc8092/sdk";

const client = new AssociationsClient();

// 1. create association
const aar = await client.createAssociation({
  initiator: "0xAlice...",
  approver: "0xBob...",
  validUntil: BigInt(Date.now() / 1000) + 86400n * 30n, // 30 days
});

// 2. both parties sign
const aliceSig = await client.signAssociation(aar, aliceWallet);
const bobSig = await client.signAssociation(aar, bobWallet);

// 3. build signed record
const sar = client.buildSignedRecord(aar, aliceSig, bobSig);

// 4. submit to blockchain
const txHash = await client.registerAssociation(sar, aliceWallet);

// 5. get the association hash
const hash = client.computeHash(aar);

// 6. later, revoke
await client.revokeAssociation(hash, undefined, aliceWallet);
```

## License

MIT
