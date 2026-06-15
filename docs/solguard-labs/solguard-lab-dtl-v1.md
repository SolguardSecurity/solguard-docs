# Solguard Lab - DTL v1

![DTL v1](./assets/dtl-v1.png)

Solguard Lab DTL v1 is a compact vulnerable distributed-ledger fixture written in Go with a small TypeScript support layer. It is not a production blockchain implementation. Instead, it is a deterministic protocol skeleton designed to expose the minimum set of components needed to reason about ledger execution, validator finality, bridge routing and off-chain consumption.

## Overview

This lab models the shape of a small blockchain node without introducing external network dependencies or heavyweight infrastructure. Transactions are submitted, blocks are applied, validators sign checkpoints and off-chain services consume the resulting state through typed client boundaries. The system is intentionally reduced, but it still preserves the control flow that matters when documenting or auditing a ledger stack.

Because the repository is deterministic and offline-friendly, it works especially well as a fixture for repeatable security analysis and documentation.

## System Architecture

The native node entrypoint lives in `cmd/dtld`. Its role is to bootstrap a symbolic node process and expose the current ledger view, making the repository feel like a runnable protocol implementation rather than just a collection of isolated packages.

The core execution state is owned by `internal/ledger`, which applies blocks, tracks balances and verifies state roots. Finality logic is separated into `internal/consensus`, where validator sets, checkpoints and quorum decisions are modeled. This keeps state transition logic distinct from the logic that decides whether a checkpoint can be treated as finalized.

Network behavior is represented by `internal/network`, which models signed gossip envelopes. Cross-domain movement is represented by `internal/bridge`, which defines route handling and message execution boundaries. Shared protocol types sit under `pkg/types`, giving the Go packages a common language for hashes, domains and ledger objects.

Alongside the Go core, the TypeScript layer provides operational consumers: an RPC client, a bridge executor and a state indexer. Those pieces do not redefine consensus or ledger execution, but they do model how surrounding infrastructure reads, relays and interprets the native state.

## Execution Model

The normal flow starts when a client builds and submits a transaction. The ledger applies ordered transactions into a new block and derives the next state root. Validators then sign a checkpoint that commits to the block height and resulting state. Once enough validator power signs the same checkpoint, the finality verifier accepts it as authoritative.

That finalized state is then consumed by downstream services. Indexers build queryable views from blocks and checkpoints, while relayers use configured routes to execute cross-domain messages. In other words, the lab separates state production, state finalization and state consumption into distinct but connected layers.

This makes the repository useful for understanding where a ledger actually becomes trustworthy for downstream automation. The raw block path is not the whole system; checkpoint verification and route-aware consumers are equally important parts of the infrastructure.

## Tooling And Operations

The Go side is laid out conventionally with `cmd/`, `internal/`, `pkg/` and `tests/`. The TypeScript side under `ts/` mirrors the kinds of services that usually grow around a node implementation, including RPC access, relaying and indexing. That split is valuable because it documents a ledger as an ecosystem, not just as native code.

Operationally, the lab expects a simple local loop: run Go tests, install the TypeScript dependencies, execute the TypeScript tests and optionally run the symbolic node entrypoint. Since there are no external services, each run should produce stable behavior suitable for tracing and repeatable analysis.

## Why This Lab Matters

DTL v1 is the entry point to the infrastructure series. It is vulnerable by design, but its main value is architectural clarity. It shows how even a small ledger stack already has multiple trust boundaries: transaction intake, state transition validation, validator quorum, bridge routing and off-chain state interpretation. That makes it a solid baseline for documenting how distributed-ledger infrastructure is assembled before moving into more advanced versions.
