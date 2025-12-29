# Contracts Audit Fixes - Scratchpad

## Background and Motivation

The `contracts/` folder was audited before committing to GitHub. The audit identified several issues ranging from critical security bugs to documentation improvements. This scratchpad tracks the fixes needed.

**Goal:** Clean up the contracts to be production-ready and safe to publish publicly.

## Key Challenges and Analysis

### Critical Security Issue

The `ValidationLib.validateSAR()` function allows empty signatures to bypass validation entirely. If `initiatorSignature.length == 0` or `approverSignature.length == 0`, the signature check is skipped and the SAR passes validation. This means associations could be registered with no valid signatures.

### Code Duplication

The `src/lib/InteroperableAddress.sol` is a near-exact copy of OpenZeppelin's `contracts/utils/draft-InteroperableAddress.sol`. Since OZ is already a dependency, this should be imported rather than duplicated.

### Dead Code

`src/interfaces/IERC1271.sol` defines a non-standard interface (returns `bool` instead of `bytes4`) and isn't imported anywhere in the codebase. It should be deleted.

### Test Gaps

Test coverage is limited to happy paths. Missing fuzz tests, invariant tests, and edge case coverage.

## High-level Task Breakdown

### Phase 1: Critical Security Fixes

- [ ] **Task 1.1: Fix empty signature validation bypass**
  - File: `src/lib/ValidationLib.sol`
  - Add check that both signatures are non-empty before proceeding with validation
  - Success criteria: Test that empty signatures cause validation to fail

- [ ] **Task 1.2: Add test for empty signature rejection**
  - File: `test/Personas.t.sol`
  - Add test `test_RevertOnEmptySignature()` that verifies empty signatures are rejected
  - Success criteria: Test passes and covers both initiator and approver empty signature cases

### Phase 2: Code Cleanup

- [ ] **Task 2.1: Delete unused IERC1271 interface**
  - File: `src/interfaces/IERC1271.sol`
  - Delete the file entirely (it's not imported anywhere and is non-standard)
  - Success criteria: File deleted, `forge build` still passes

- [ ] **Task 2.2: Replace local InteroperableAddress with OZ import**
  - File: `src/lib/InteroperableAddress.sol`
  - Delete local copy, update imports in `Personas.sol` and `ValidationLib.sol` to use `@openzeppelin/contracts/utils/draft-InteroperableAddress.sol`
  - Add `EIP155_CHAIN_TYPE` constant locally where needed
  - Success criteria: `forge build` and `forge test` pass

- [ ] **Task 2.3: Standardize pragma versions**
  - Files: All `.sol` files in `src/`
  - Standardize to `^0.8.23` (broader compatibility)
  - Success criteria: All files use same pragma, `forge build` passes

- [ ] **Task 2.4: Fix unused variable warning in ValidationLib**
  - File: `src/lib/ValidationLib.sol`
  - Change `(bytes2 chainType, bytes memory chainReference, bytes memory addr)` to `(bytes2 chainType, , bytes memory addr)`
  - Success criteria: No compiler warnings about unused variables

### Phase 3: Gas Optimizations

- [ ] **Task 3.1: Refactor isValid to internal function**
  - File: `src/Personas.sol`
  - Create `_isValid(bytes32 hash)` internal function
  - Have public `isValid()` call `_isValid()`
  - Update `getActiveAssociationsForAccount()` and `areAccountsAssociated()` to use `_isValid()`
  - Success criteria: All tests pass, avoids external self-calls

### Phase 4: Feature Improvements

- [ ] **Task 4.1: Validate initiator signature in proposeAssociation**
  - File: `src/Personas.sol`
  - Add signature validation before storing proposal
  - Success criteria: Invalid proposals are rejected at creation time

- [ ] **Task 4.2: Add cancelProposal for initiators**
  - File: `src/Personas.sol` and `src/interfaces/IPersonas.sol`
  - Add function allowing initiator to cancel their own pending proposal
  - Success criteria: Initiators can cancel, tests pass

### Phase 5: Test Coverage

- [ ] **Task 5.1: Add fuzz tests**
  - File: `test/Personas.t.sol`
  - Add fuzz tests for registration and proposal flows
  - Success criteria: Fuzz tests pass with `forge test`

- [ ] **Task 5.2: Add edge case tests**
  - File: `test/Personas.t.sol`
  - Add tests for: proposal rejection, unauthorized revocation, duplicate proposals, expired associations, future validAt
  - Success criteria: All edge cases covered and passing

- [ ] **Task 5.3: Add query function tests**
  - File: `test/Personas.t.sol`
  - Test `getAssociationsForAccount`, `getActiveAssociationsForAccount`, `areAccountsAssociated`
  - Success criteria: Query functions have test coverage

### Phase 6: Documentation

- [ ] **Task 6.1: Update README**
  - File: `contracts/README.md`
  - Replace boilerplate Foundry README with project-specific documentation
  - Include: project description, architecture, deployment instructions, example usage
  - Success criteria: README accurately describes the project

- [ ] **Task 6.2: Add warning comment to Interact.s.sol**
  - File: `script/Interact.s.sol`
  - Add comment warning that hardcoded keys are public Anvil test keys
  - Success criteria: Clear warning present

## Project Status Board

### To Do

- [ ] Task 3.1: Refactor isValid to internal function
- [ ] Task 4.1: Validate initiator signature in proposeAssociation
- [ ] Task 4.2: Add cancelProposal for initiators
- [ ] Task 5.1: Add fuzz tests
- [ ] Task 5.2: Add edge case tests
- [ ] Task 5.3: Add query function tests
- [ ] Task 6.1: Update README

### In Progress

(none)

### Completed (Pending User Verification)

- [x] Task 1.1: Fix empty signature validation bypass
- [x] Task 1.2: Add test for empty signature rejection (added 3 tests)
- [x] Task 2.1: Delete unused IERC1271 interface
- [x] Task 2.2: Replace local InteroperableAddress with OZ import
- [x] Task 2.3: Standardize pragma versions (KeyTypes.sol updated)
- [x] Task 2.4: Fix unused variable warning
- [x] Task 6.2: Add warning comment to Interact.s.sol

## Executor's Feedback or Assistance Requests

### 2025-12-29: Milestone - Phase 1 & 2 Complete

**Completed Tasks:**

1. ✅ **Task 1.1** - Fixed empty signature bypass in `ValidationLib.sol` by adding check on line 77-79
2. ✅ **Task 1.2** - Added 3 new tests: `test_RevertOnEmptyInitiatorSignature`, `test_RevertOnEmptyApproverSignature`, `test_RevertOnBothEmptySignatures`
3. ✅ **Task 2.1** - Deleted `src/interfaces/IERC1271.sol`
4. ✅ **Task 2.2** - Deleted local `src/lib/InteroperableAddress.sol`, updated all imports to use OZ's `draft-InteroperableAddress.sol`
5. ✅ **Task 2.3** - Updated `KeyTypes.sol` pragma from `^0.8.26` to `^0.8.23`
6. ✅ **Task 2.4** - Fixed unused variable warning by using `(bytes2 chainType, , bytes memory addr)`
7. ✅ **Task 6.2** - Added warning comment about public Anvil test keys in `Interact.s.sol`

**Build Status:** ✅ `forge build` passes

**Blocker:** `forge test` crashes due to a Foundry bug on macOS (system-configuration panic).
**Request:** Please run `cd contracts && forge test` manually in your terminal to verify the tests pass.

**Remaining Tasks:** 7 (Phase 3-6)

## Lessons

- OpenZeppelin has `draft-InteroperableAddress.sol` available - prefer importing from OZ over duplicating code
- ERC-1271 returns `bytes4` magic value, not `bool`
- Always validate signatures are non-empty before checking validity
