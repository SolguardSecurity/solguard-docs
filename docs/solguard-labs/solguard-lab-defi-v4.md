# Solguard Lab - DeFi v4

![DeFi v4](./assets/defi-v4.png)

Solguard Lab DeFi v4 is a Solana-native vulnerable vault lab written in Rust. It takes the managed-vault ideas introduced in DeFi v3 and re-expresses them in an account-based execution environment, where program-derived addresses, epoch-partitioned state and settlement snapshots define how value moves through the system.

## Overview

The lab models a vault that accepts deposits, allocates capital into strategy debt, receives performance reports from a manager and processes withdrawals through delayed settlement windows. Unlike an EVM-style vault, however, the protocol state is fragmented across multiple account families. That makes the repository a useful study of how Solana programs decompose protocol state into deterministic address spaces instead of keeping everything inside one monolithic contract storage layout.

The result is still a single coherent system, but it is one whose infrastructure is expressed through explicit state accounts and tightly controlled execution paths.

## System Architecture

The main state container is `VaultState`, which holds the core ledger for idle liquidity, deployed strategy debt, fee parameters, epoch position and withdrawal queue metadata. Around it sit several specialized account types that give the vault a more granular operational shape.

`OracleWindow` stores a cached price snapshot tied to settlement and NAV views. This is not just a passive helper. It is the time-bounded price context against which settlement decisions are made, so oracle freshness becomes part of the execution model.

`WithdrawReceipt` accounts represent queued withdrawal intent for a specific owner and epoch, while `SettlementSnapshot` accounts represent the finalized view of a withdrawal epoch after manager action. Together, those two account families separate the act of requesting an exit from the act of settling it.

Program-derived addresses are used to derive these accounts deterministically. The vault, oracle windows, withdrawal receipts and settlement snapshots all live inside a predictable namespace built from seeds such as asset identity, share mint and epoch slots.

## Execution Model

Depositors contribute idle liquidity and receive vault shares. The manager can then allocate a portion of that idle balance into strategy debt and later report gains, losses and released capital back into the vault ledger. As in the Vyper vault, accounting depends on both local liquidity and managed exposure outside the idle pool.

Withdrawals are asynchronous. A user requests withdrawal into a future epoch, which creates queued state rather than immediate asset release. When the manager finalizes that epoch, the program binds settlement to an oracle window and writes the resulting snapshot into dedicated settlement state. Only then can queued receipts be claimed.

This structure matters because the protocol is not just a vault with delayed withdrawals; it is a vault whose state transitions are distributed across derived accounts with explicit handoff points. Share accounting, locked-profit behavior, fee minting and settlement consumption all need to remain synchronized across those account families.

## Tooling And Operations

The repository is organized around Rust modules such as `state`, `pda`, `processor` and `math`, with tests and example flows separated from the program core. The `processor` layer is especially important because it encodes the instruction paths that mutate vault state, queue receipts and finalize epochs.

Operational guidance in this lab is centered on three concerns: validating PDA derivation, refreshing oracle windows before settlement-sensitive scenarios and rerunning tests after changes to epoch logic or fee math. Because state is partitioned across multiple accounts, deterministic derivation and consistent account consumption are part of the protocol's infrastructure, not mere implementation details.

## Why This Lab Matters

DeFi v4 is the most infrastructure-heavy DeFi lab in the set because it adds Solana's account model to the usual vault-accounting concerns. The lab is vulnerable by design, but its deeper value lies in showing how managed capital, delayed withdrawals, oracle-bounded settlement and derived-address state composition come together inside a Rust program that looks and feels like a real Solana protocol surface.
