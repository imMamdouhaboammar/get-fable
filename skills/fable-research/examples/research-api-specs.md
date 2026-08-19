# Example: Researching Updated API Contract

## Task
Verify Stripe API webhook signature verification format in SDK v14+.

## Steps
1. Query official documentation for `stripe.webhooks.constructEvent`.
2. Extract header requirement (`stripe-signature`) and raw body requirement (`Buffer`).
3. Record finding: "[measured] Stripe v14 requires unparsed raw buffer for signature verification."
4. Hand off to `fable-plan`.
