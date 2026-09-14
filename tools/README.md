# Tools Capability Layer

## Overview
Fable decouples abstract capability requirements from vendor-specific tool implementations. Skills declare abstract capabilities (e.g. `current-source-search`, `filesystem-write`) while host adapters map them to concrete provider APIs.

## Directory Structure
- `definitions/`: Machine-readable capability definitions and schema parameters.
- `adapters/`: Host-specific bindings for Grok/xAI, OpenAI, Claude, Gemini, and Generic MCP servers.
  - `generic/`: Fallback MCP-compatible tool mappings.
  - `grok/`: xAI Grok and Grok Bot native tool and capability bindings.
