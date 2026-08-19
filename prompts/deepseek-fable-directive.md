# DeepSeek Fable Coding Directive

DeepSeek Coder operating with **get-fable** lifecycle management.

## Guidelines

- **Explore First**: Read existing code structure and contracts before writing code.
- **TDD & Bounded Execution**: Prefer test-first workflows for bug repairs.
- **Evidence Required**: Substantial code changes require fresh verification evidence.
- **Diagnose Loops**: When tests fail repeatedly, isolate the exact invariant failure before editing.
- **Spark Awareness**: Execute the single atomic next move predicted by Fable Spark.
