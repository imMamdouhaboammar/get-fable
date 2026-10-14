# Fable Eco Task Dependency Graph

## Critical path

```text
ECO-001
  -> ECO-002
  -> ECO-003
  -> ECO-004
  -> ECO-005
  -> ECO-013
  -> ECO-014/ECO-015
  -> ECO-020
  -> ECO-021
  -> ECO-023
  -> ECO-027
  -> ECO-034
  -> ECO-035
  -> ECO-036
  -> ECO-037
  -> ECO-046
```

Runtime critical path:

```text
ECO-001
  -> ECO-060
  -> ECO-061
  -> ECO-062
  -> ECO-063
  -> ECO-065
  -> ECO-067
  -> ECO-068
```

Host enforcement path:

```text
ECO-010
  -> ECO-012
  -> ECO-040
  -> ECO-041
  -> ECO-042/ECO-043
  -> ECO-066
```

Security release path:

```text
ECO-026
ECO-041
ECO-064
  -> ECO-085
  -> ECO-093
```

## Parallelization opportunities

After ECO-001:
- capability model and machine-fact model can proceed independently
- skill registration can proceed independently from transaction engine
- logging/redaction can begin independently

After ECO-005:
- profiles and version metadata abstraction can proceed in parallel

After ECO-027:
- individual install drivers can be implemented in parallel only if each has one write owner and separate files

After ECO-041:
- separate host adapters can be qualified independently

After ECO-065:
- host exposure, result protocol, delegated-agent provider, and explain-run can proceed in parallel if interfaces are frozen

## Do not parallelize

Do not have multiple agents concurrently mutate:
- shared Rust model enums
- workspace Cargo dependency versions
- same host adapter config file
- registry/generated catalog files
- official capability manifest for the same capability
- transaction journal state machine

## Merge order

1. foundational models
2. pure resolvers
3. plan model
4. transaction journal
5. drivers
6. state commit/recovery
7. host patching
8. CLI mutation
9. runtime
10. evidence bridge
11. capability qualification
12. release gating
