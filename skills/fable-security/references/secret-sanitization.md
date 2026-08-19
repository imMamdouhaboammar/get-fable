# Secret Sanitization Protocol

## Zero Exposure Rules
- Never print raw API keys, service role keys, or tokens in terminal logs or files.
- Mask keys (`sk_live_...4a9f`) in reports.
- Ensure `.env` and `credentials.json` are gitignored.
