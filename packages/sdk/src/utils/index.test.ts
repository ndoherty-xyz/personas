import { describe, it, expect } from "vitest";
import {
  hashAddress,
  hashAAR,
  isAssociationValid,
  getEIP712TypedData,
} from "./index";
import type {
  AssociatedAccountRecord,
  SignedAssociationRecord,
} from "../types";

// Use properly checksummed test addresses
const TEST_ADDRESS_1 = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as const;
const TEST_ADDRESS_2 = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed" as const;

describe("hashAddress", () => {
  it("should hash an ethereum address deterministically", () => {
    const hash1 = hashAddress(TEST_ADDRESS_1);
    const hash2 = hashAddress(TEST_ADDRESS_1);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it("should produce different hashes for different addresses", () => {
    const hash1 = hashAddress(TEST_ADDRESS_1);
    const hash2 = hashAddress(TEST_ADDRESS_2);

    expect(hash1).not.toBe(hash2);
  });
});

describe("hashAAR", () => {
  it("should hash an AAR deterministically", () => {
    const aar: AssociatedAccountRecord = {
      initiator: {
        addressHash:
          "0x1234567890123456789012345678901234567890123456789012345678901234" as const,
        keyType: "0x00",
      },
      approver: {
        addressHash:
          "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd" as const,
        keyType: "0x00",
      },
      validAt: 1000000n,
      validUntil: 2000000n,
      interfaceId: "0x00000000",
      data: "0x",
    };

    const hash1 = hashAAR(aar);
    const hash2 = hashAAR(aar);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it("should produce different hashes for different AARs", () => {
    const aar1: AssociatedAccountRecord = {
      initiator: {
        addressHash:
          "0x1234567890123456789012345678901234567890123456789012345678901234" as const,
        keyType: "0x00",
      },
      approver: {
        addressHash:
          "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd" as const,
        keyType: "0x00",
      },
      validAt: 1000000n,
      validUntil: 2000000n,
      interfaceId: "0x00000000",
      data: "0x",
    };

    const aar2: AssociatedAccountRecord = {
      ...aar1,
      validAt: 1000001n,
    };

    const hash1 = hashAAR(aar1);
    const hash2 = hashAAR(aar2);

    expect(hash1).not.toBe(hash2);
  });
});

describe("isAssociationValid", () => {
  const createSAR = (
    overrides?: Partial<SignedAssociationRecord>
  ): SignedAssociationRecord => ({
    aar: {
      initiator: {
        addressHash:
          "0x1234567890123456789012345678901234567890123456789012345678901234" as const,
        keyType: "0x00",
      },
      approver: {
        addressHash:
          "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd" as const,
        keyType: "0x00",
      },
      validAt: 1000000n,
      validUntil: 2000000n,
      interfaceId: "0x00000000",
      data: "0x",
    },
    initiatorSignature: {
      keyType: "0x00",
      signature: "0x",
    },
    approverSignature: {
      keyType: "0x00",
      signature: "0x",
    },
    revokedAt: 0n,
    ...overrides,
  });

  it("should return true for valid association", () => {
    const sar = createSAR();
    const isValid = isAssociationValid(sar, 1500000n);

    expect(isValid).toBe(true);
  });

  it("should return false for revoked association", () => {
    const sar = createSAR({ revokedAt: 1500000n });
    const isValid = isAssociationValid(sar, 1600000n);

    expect(isValid).toBe(false);
  });

  it("should return false if not valid yet", () => {
    const sar = createSAR();
    const isValid = isAssociationValid(sar, 999999n);

    expect(isValid).toBe(false);
  });

  it("should return false if expired", () => {
    const sar = createSAR();
    const isValid = isAssociationValid(sar, 2000001n);

    expect(isValid).toBe(false);
  });

  it("should return true if validUntil is 0 (no expiry)", () => {
    const sar = createSAR({
      aar: {
        ...createSAR().aar,
        validUntil: 0n,
      },
    });
    const isValid = isAssociationValid(sar, 9999999999n);

    expect(isValid).toBe(true);
  });
});

describe("getEIP712TypedData", () => {
  it("should generate valid EIP-712 typed data", () => {
    const aar: AssociatedAccountRecord = {
      initiator: {
        addressHash:
          "0x1234567890123456789012345678901234567890123456789012345678901234" as const,
        keyType: "0x00",
      },
      approver: {
        addressHash:
          "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd" as const,
        keyType: "0x00",
      },
      validAt: 1000000n,
      validUntil: 2000000n,
      interfaceId: "0x00000000",
      data: "0x",
    };

    const typedData = getEIP712TypedData(
      aar,
      84532,
      "0x6f4D643BD9332d9Aa3a828576e3a64ccc58D2684"
    );

    expect(typedData.domain.name).toBe("AssociatedAccounts");
    expect(typedData.domain.version).toBe("1");
    expect(typedData.domain.chainId).toBe(84532n);
    expect(typedData.primaryType).toBe("AssociatedAccountRecord");
    expect(typedData.message).toEqual(aar);
    expect(typedData.types.AssociatedAccountRecord).toBeDefined();
    expect(typedData.types.Address).toBeDefined();
  });
});
