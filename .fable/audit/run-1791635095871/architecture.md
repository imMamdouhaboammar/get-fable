# Architecture & Threat Boundary Model: GET-FABLE

## 1. Target Identity & Operating Context
- **Target:** `./`
- **Type:** Local Codebase & Repository Surface
- **Audit Methodology:** Cloudflare Coverage-Led Security Audit Engine

## 2. Core Principals & Trust Boundaries
- **Principal A (Anonymous / Lower-Trust):** Public callers, unauthenticated HTTP requests, untrusted client input.
- **Principal B (Authenticated User / Tenant):** Token-bearing callers bounded by organization / tenant ID.
- **Principal C (Privileged / Operator):** Admin roles, internal service workers, system configuration processes.
- **Boundary Alpha:** Public ingress -> Authentication / Gateway verification.
- **Boundary Beta:** Tenant isolation / Object-level authorization (IDOR / BOLA boundary).
- **Boundary Gamma:** Service logic -> Execution sinks (Database, File System, OS Exec, Remote APIs).

## 3. Entry Surfaces & Execution Sinks
- **Entry Surfaces:** HTTP routes, JSON/Form payloads, URL parameters, HTTP headers, CLI args, WebSockets.
- **Storage & State Sinks:** Database queries, environment configuration, persistent stores, cached tokens.
- **System Execution Sinks:** Process spawning, template rendering, deserialization pipelines.

## 4. Deterministic Coverage Ledger Strategy
Coverage units track combinations of [Surface]::[Boundary]::[Subsystem]::[AttackClass].
Every unit is assigned a deterministic RFC 3986 percent-encoded canonical coverage ID.
