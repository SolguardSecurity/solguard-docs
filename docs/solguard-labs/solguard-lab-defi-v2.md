# Solguard Lab - DeFi v2

![DeFi v2](./assets/defi-v2.png)

Solguard Lab DeFi v2 is a Hardhat-based vulnerable lending lab that keeps the same high-level economic model as DeFi v1 but shifts the development and execution environment toward a TypeScript-first workflow. The result is a protocol that still centers on a single lending venue, yet exposes a richer operational surface through scripts, typed tests and deployment-oriented tooling.

## Overview

The lab models a compact market where liquidity providers supply a base asset, receive market shares and make that liquidity available to borrowers who lock one collateral asset. Debt, collateral health and liquidations all remain internal to the market contract, while prices and rewards are delegated to specialized modules.

Compared with the Foundry version, this lab is less about introducing new protocol primitives and more about showing how the same protocol category behaves inside a different engineering stack. That matters because the audit surface of a system is shaped not only by contract logic, but also by the surrounding toolchain used to compile, seed, test and interact with the deployment.

## System Architecture

`SeabirdMarket` is the core contract. It manages base-asset liquidity, issues LP shares, stores collateral balances, tracks borrower debt and controls liquidation flows. In architectural terms, it is both the protocol ledger and the main execution engine for end-user actions.

The pricing boundary is handled by `AdaptiveOracle`. It stores one latest price snapshot per asset and exposes a narrow pull-based interface to the market. The market does not own any pricing logic itself; it consumes the oracle's latest state when evaluating solvency-related operations. This keeps asset pricing decoupled from state transitions while still making the oracle a critical dependency for safe execution.

Incentives are managed by `IncentiveDistributor`, which streams rewards to LPs according to share ownership over time. This layer is deliberately separate from the market's liquidity accounting. LP shares determine entitlement, but the reward subsystem only tracks accrual and claims; it does not define the market balance sheet.

Mock assets and local helpers complete the system, providing deterministic fixtures for seeded scenarios and repeatable tests.

## Execution Model

The execution lifecycle starts with LP deposits. A depositor transfers the base asset into the market and receives shares that encode their proportional claim over protocol assets. Borrowers then post collateral and draw liquidity from the same venue, so the contract must continuously reconcile liquid cash, borrower debt and protocol-owned fees.

Oracle reads are embedded into health-sensitive actions. Borrow limits depend on the value of posted collateral, and liquidation sizing depends on the same pricing surface. Because the oracle stores only the latest snapshot per asset, the system behaves like a minimal real-time market rather than a historical pricing engine.

Borrow fees accumulate inside the market and remain there until treasury withdrawal is explicitly invoked. This preserves a clear operational distinction between fee generation and fee collection. Meanwhile, reward distribution proceeds independently through funded reward windows and user checkpoints, allowing the protocol to express liquidity incentives without coupling claims to lending-state mutations.

## Tooling And Operations

The repository uses Hardhat with Bun and TypeScript. Protocol contracts live under `contracts/`, while tests, scripts and typed configuration define the operational layer around them. The `scripts/` directory is particularly relevant from a documentation perspective because it shows how local seeding and deployment helpers sit alongside the protocol rather than inside the contracts themselves.

This structure makes the lab useful for studying the boundary between on-chain and off-chain engineering. Compilation, static checks, typed tests and scenario setup all belong to the environment in which the protocol is exercised, and that environment often affects how assumptions are validated in practice.

## Why This Lab Matters

DeFi v2 represents a realistic audit target for teams that build Solidity systems with JavaScript or TypeScript tooling instead of a purely Forge-native workflow. The market remains intentionally vulnerable, but the surrounding infrastructure is closer to what many protocol teams actually use for local development. That makes the lab valuable not only as a smart-contract exercise, but also as a study of how protocol state, operator tooling and test automation fit together in a modern Hardhat stack.
