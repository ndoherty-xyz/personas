import { describe, it, expect } from "vitest";
import {
  formatERC7930Address,
  hashERC7930Address,
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
const TEST_CHAIN_ID = 84532;

describe("formatERC7930Address", () => {
  it("should format an ethereum address as ERC-7930", () => {
    const formatted = formatERC7930Address(TEST_CHAIN_ID, TEST_ADDRESS_1);

    expect(formatted).toMatch(/^0x/);
    // ERC-7930: version(2) + chainType(2) + chainRefLen(1) + chainRef(3) + addrLen(1) + addr(20) = 29 bytes = 58 hex chars + 0x
    expect(formatted.length).toBe(60);
  });

  it("should produce different formatted addresses for different inputs", () => {
    const formatted1 = formatERC7930Address(TEST_CHAIN_ID, TEST_ADDRESS_1);
    const formatted2 = formatERC7930Address(TEST_CHAIN_ID, TEST_ADDRESS_2);

    expect(formatted1).not.toBe(formatted2);
  });
});

describe("hashERC7930Address", () => {
  it("should hash an ERC-7930 address deterministically", () => {
    const erc7930 = formatERC7930Address(TEST_CHAIN_ID, TEST_ADDRESS_1);
    const hash1 = hashERC7930Address(erc7930);
    const hash2 = hashERC7930Address(erc7930);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it("should produce different hashes for different addresses", () => {
    const erc7930_1 = formatERC7930Address(TEST_CHAIN_ID, TEST_ADDRESS_1);
    const erc7930_2 = formatERC7930Address(TEST_CHAIN_ID, TEST_ADDRESS_2);
    const hash1 = hashERC7930Address(erc7930_1);
    const hash2 = hashERC7930Address(erc7930_2);

    expect(hash1).not.toBe(hash2);
  });
});

describe("hashAAR", () => {
  const createAAR = (): AssociatedAccountRecord => ({
    initiator: formatERC7930Address(TEST_CHAIN_ID, TEST_ADDRESS_1),
    approver: formatERC7930Address(TEST_CHAIN_ID, TEST_ADDRESS_2),
    validAt: 1000000,
    validUntil: 2000000,
    interfaceId: "0x00000000",
    data: "0x",
  });

  it("should hash an AAR deterministically", () => {
    const aar = createAAR();
    const hash1 = hashAAR(aar);
    const hash2 = hashAAR(aar);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it("should produce different hashes for different AARs", () => {
    const aar1 = createAAR();
    const aar2: AssociatedAccountRecord = {
      ...aar1,
      validAt: 1000001,
    };

    const hash1 = hashAAR(aar1);
    const hash2 = hashAAR(aar2);

    expect(hash1).not.toBe(hash2);
  });
});

describe("isAssociationValid", () => {
  const createSAR = (
    overrides?: Partial<SignedAssociationRecord>
  ): SignedAssociationRecord => {
    const baseRecord: AssociatedAccountRecord = {
      initiator: formatERC7930Address(TEST_CHAIN_ID, TEST_ADDRESS_1),
      approver: formatERC7930Address(TEST_CHAIN_ID, TEST_ADDRESS_2),
      validAt: 1000000,
      validUntil: 2000000,
      interfaceId: "0x00000000",
      data: "0x",
    };

    return {
      record: baseRecord,
      initiatorKeyType: "0x0001",
      approverKeyType: "0x0001",
      initiatorSignature: "0x",
      approverSignature: "0x",
      revokedAt: 0,
      ...overrides,
    };
  };

  it("should return true for valid association", () => {
    const sar = createSAR();
    const isValid = isAssociationValid(sar, 1500000);

    expect(isValid).toBe(true);
  });

  it("should return false for revoked association", () => {
    const sar = createSAR({ revokedAt: 1500000 });
    const isValid = isAssociationValid(sar, 1600000);

    expect(isValid).toBe(false);
  });

  it("should return false if not valid yet", () => {
    const sar = createSAR();
    const isValid = isAssociationValid(sar, 999999);

    expect(isValid).toBe(false);
  });

  it("should return false if expired", () => {
    const sar = createSAR();
    const isValid = isAssociationValid(sar, 2000001);

    expect(isValid).toBe(false);
  });

  it("should return true if validUntil is 0 (no expiry)", () => {
    const sar = createSAR({
      record: {
        ...createSAR().record,
        validUntil: 0,
      },
    });
    const isValid = isAssociationValid(sar, 9999999999);

    expect(isValid).toBe(true);
  });
});

describe("getEIP712TypedData", () => {
  it("should generate valid EIP-712 typed data", () => {
    const aar: AssociatedAccountRecord = {
      initiator: formatERC7930Address(TEST_CHAIN_ID, TEST_ADDRESS_1),
      approver: formatERC7930Address(TEST_CHAIN_ID, TEST_ADDRESS_2),
      validAt: 1000000,
      validUntil: 2000000,
      interfaceId: "0x00000000",
      data: "0x",
    };

    const typedData = getEIP712TypedData(
      aar,
      TEST_CHAIN_ID,
      "0x6f4D643BD9332d9Aa3a828576e3a64ccc58D2684"
    );

    expect(typedData.domain.name).toBe("AssociatedAccounts");
    expect(typedData.domain.version).toBe("1");
    expect(typedData.domain.chainId).toBe(BigInt(TEST_CHAIN_ID));
    expect(typedData.primaryType).toBe("AssociatedAccountRecord");
    expect(typedData.message).toEqual(aar);
    expect(typedData.types.AssociatedAccountRecord).toBeDefined();
  });
});
