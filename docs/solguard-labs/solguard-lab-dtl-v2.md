# Solguard Lab - DTL v2

![DTL v2](./assets/dtl-v2.png)

Solguard Lab DTL v2 is a Rust and TypeScript vulnerable distributed-ledger lab that expands the compact model of DTL v1 into a more complete blockchain-style stack. It introduces a dedicated mempool, validator epochs, checkpoint finality, bridge batches, storage abstractions and scenario tooling while preserving deterministic local execution.

## Overview

The repository is still symbolic rather than production-grade, but it is large enough to represent the major layers auditors expect in a ledger codebase: execution, ordering, consensus, storage, bridging and off-chain consumers. That makes DTL v2 a transition point between a minimal fixture and a recognizably modular protocol implementation.

Its design goal is to be rich in relationships rather than rich in dependencies. The code exposes how components connect to each other without requiring external networking, databases or cryptographic services.

## System Architecture

The Rust core is organized under `src/` into focused modules. `ledger` applies transactions, emits receipts and verifies state roots. `mempool` manages pending transactions, including same-nonce replacement and ordering policy. `consensus` models validator epochs, checkpoints and light-client finality decisions. `bridge` defines routes, proofs, message batches and execution state. `storage` and `rpc` provide supporting boundaries for persistence-oriented views and node-facing interfaces. Shared hashes, addresses and domain identifiers live in `primitives`.

This modular split is important because the system is no longer just a ledger plus validator logic. Ordering decisions now have their own lifecycle, bridge execution has explicit proof objects and epoch activation becomes part of the consensus story.

The TypeScript layer under `ts/` extends that architecture with an RPC client, a state indexer, a batch relayer and a scenario runner. Those components model the operational consumers that usually sit around a node and turn finalized native state into usable external workflows.

## Execution Model

A transaction first enters the mempool, where it competes with other pending transactions under the local ordering rules. From there, ordered transactions are applied by the ledger, which produces receipts and a new state root. Consensus then evaluates checkpoints signed by validator sets grouped by epoch and marks state as finalized when quorum is reached.

The bridge layer builds on top of that finalized execution model. Messages are grouped into batches, bound to routes and associated with receipt proofs that stand in for cross-domain execution evidence. This means bridge processing is not independent from ledger and consensus state; it depends on the same finalized foundation.

The TypeScript indexer and relayer then consume this protocol output from different angles. The indexer builds canonical views, while the relayer focuses on route-aware execution and idempotent handling of batches. Together, they demonstrate how infrastructure services often reflect the same native state through different operational responsibilities.

## Tooling And Operations

DTL v2 uses Cargo for the Rust core and Bun-based TypeScript tooling for the off-chain side. The repository includes a symbolic node binary in `src/bin/dtld.rs`, native integration tests in `tests/` and a separate TypeScript test suite for clients, indexing, relaying and deterministic scenarios.

Operationally, the expected flow is to format and test the Rust side, validate TypeScript types and tests, then use local analysis tooling against the repository structure. The deterministic design keeps the outputs stable enough for documentation work and repeated audit passes.

## Why This Lab Matters

DTL v2 is useful because it introduces the infrastructure concepts that make ledger systems substantially harder to reason about: mempool policy, epoch-aware validator rotation, proof-bound bridge batches and multiple off-chain consumers of finalized state. The lab is vulnerable by design, but as documentation material it is valuable because it shows how a moderately layered Rust-based ledger stack is assembled without hiding the relationships between its native and TypeScript components.
