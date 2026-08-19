# Example: Polling a Background Build Job

## Steps
1. Initiate build via CLI.
2. Poll status endpoint every 5 seconds (up to 12 iterations / 60s max).
3. On status === 'success', exit loop and record receipt.
