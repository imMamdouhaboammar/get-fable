# Example: Flattening Nested Conditionals

## Before
```typescript
function process(user) {
  if (user) {
    if (user.active) {
      if (user.role === 'admin') {
        return doAdmin();
      }
    }
  }
  return null;
}
```

## After (Simplified)
```typescript
function process(user) {
  if (!user?.active || user.role !== 'admin') return null;
  return doAdmin();
}
```
