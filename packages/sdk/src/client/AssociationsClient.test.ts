import { describe, it, expect, beforeAll } from "vitest";
import { AssociationsClient } from "./AssociationsClient";
import { createPublicClient, http, PublicClient } from "viem";
import { baseSepolia } from "viem/chains";

describe("AssociationsClient - Subgraph Queries", () => {
  let client: AssociationsClient;

  beforeAll(() => {
    client = new AssociationsClient({
      publicClient: createPublicClient({
        chain: baseSepolia,
        transport: http(),
      }) as PublicClient,
    });
  });

  it("should get global stats", async () => {
    const stats = await client.getGlobalStats();

    expect(stats).toBeDefined();
    expect(stats?.totalAssociations).toBeDefined();
    expect(stats?.totalAccounts).toBeDefined();
    expect(stats?.totalRevocations).toBeDefined();
    expect(Number(stats?.totalAssociations)).toBeGreaterThan(0);
  });

  it("should get association by hash and return parsed addresses", async () => {
    const hash =
      "0x3fdfddf0527d51209e37622152e318be8fa4e7356a55a373bf267b6e7084ef09";
    const association = await client.getAssociation(hash);

    expect(association).toBeDefined();
    expect(association?.id).toBe(hash);
    expect(association?.initiator).toBeDefined();
    expect(association?.approver).toBeDefined();

    // addresses should be 20 bytes (42 chars with 0x prefix)
    expect(association?.initiator.length).toBe(42);
    expect(association?.approver.length).toBe(42);
    expect(association?.initiator.startsWith("0x")).toBe(true);
    expect(association?.approver.startsWith("0x")).toBe(true);
  });

  it("should return null for non-existent association", async () => {
    const fakeHash =
      "0x0000000000000000000000000000000000000000000000000000000000000000";
    const association = await client.getAssociation(fakeHash);

    expect(association).toBeNull();
  });
});
