export interface ReviewRuleEntry {
  id: string;
  path: string;
  language: string;
  category: 'bug' | 'security' | 'performance' | 'maintainability' | 'test';
  title: string;
  description: string;
  checklist: string[];
  merge_system_rule?: boolean;
}

export interface OcrRuleConfigFile {
  rules: Array<{
    path: string;
    rule: string;
    category?: 'bug' | 'security' | 'performance' | 'maintainability' | 'test';
    merge_system_rule?: boolean;
  }>;
  excludes?: string[];
}

export const BUILTIN_OCR_RULESETS: ReviewRuleEntry[] = [
  // TypeScript & JavaScript
  {
    id: 'ocr-ts-nullish-safety',
    path: '**/*.{ts,tsx,js,jsx,mjs,cjs}',
    language: 'TypeScript/JavaScript',
    category: 'bug',
    title: 'Nullish Safety & Parameter Validation',
    description: 'Defend against TypeError: Cannot read property of undefined/null at runtime.',
    checklist: [
      'Use optional chaining (?.) and nullish coalescing (??) when accessing nested properties of nullable objects or API responses.',
      'Validate required function and API handler arguments explicitly before accessing nested attributes.',
      'Check array bounds or empty collections before indexing [0] or calling array reduction methods.',
    ],
  },
  {
    id: 'ocr-ts-concurrency-async',
    path: '**/*.{ts,tsx,js,jsx,mjs,cjs}',
    language: 'TypeScript/JavaScript',
    category: 'bug',
    title: 'Async Correctness & Promise Lifecycle',
    description: 'Prevent floating unhandled promises, state race conditions, and hung event loops.',
    checklist: [
      'Ensure all Promise-returning functions are awaited or explicitly chained with .catch() to avoid unhandled rejections.',
      'Guard against race conditions when mutating shared state across asynchronous boundaries or callback loops.',
      'Use AbortController or proper cancellation tokens for network requests and long-running listeners.',
      'Ensure Promise.all / Promise.allSettled are used intentionally depending on whether partial failure is acceptable.',
    ],
  },
  {
    id: 'ocr-ts-security-xss-injection',
    path: '**/*.{ts,tsx,js,jsx,mjs,cjs}',
    language: 'TypeScript/JavaScript',
    category: 'security',
    title: 'Injection & Prototype Pollution Prevention',
    description: 'Prevent Cross-Site Scripting (XSS), prototype poisoning, and arbitrary code execution.',
    checklist: [
      'Avoid dangerouslySetInnerHTML or unescaped string injection in DOM rendering without cryptographic or HTML sanitization.',
      'Sanitize object merge operations against prototype pollution (__proto__, constructor, prototype).',
      'Never invoke eval(), new Function(), or child_process commands with unsanitized user-provided strings.',
      'Validate external API payloads and webhook payloads using strict schema validation (e.g. Zod, ArkType, or type guards).',
    ],
  },
  {
    id: 'ocr-ts-resource-discipline',
    path: '**/*.{ts,tsx,js,jsx,mjs,cjs}',
    language: 'TypeScript/JavaScript',
    category: 'performance',
    title: 'Resource Lifecycle & Memory Leaks',
    description: 'Ensure timers, streams, sockets, and subscriptions are cleanly disposed.',
    checklist: [
      'Clear timeouts, intervals, and event listeners in teardown/cleanup lifecycle hooks.',
      'Close opened file descriptors, streams, and database clients cleanly, even in error paths.',
      'Avoid unbounded in-memory caches or growing arrays without eviction policies (LRU/TTL).',
    ],
  },

  // Python
  {
    id: 'ocr-py-none-safety',
    path: '**/*.py',
    language: 'Python',
    category: 'bug',
    title: 'NoneType Safety & Default Arguments',
    description: 'Prevent AttributeError: NoneType object has no attribute and mutable default pitfalls.',
    checklist: [
      'Never use mutable default arguments (e.g. def foo(items=[])); use def foo(items=None): items = items or [].',
      'Verify dictionary keys with .get() or in check before subscript access to prevent KeyError / NoneType dereferences.',
      'Explicitly verify return values from functions that can return None before calling methods or accessing properties.',
    ],
  },
  {
    id: 'ocr-py-security-injection',
    path: '**/*.py',
    language: 'Python',
    category: 'security',
    title: 'SQLi, Command Injection & Deserialization',
    description: 'Eliminate injection vectors in database queries, subprocess calls, and deserialization.',
    checklist: [
      'Never format or concatenate raw SQL strings; always use parameterized queries or ORM expression builders.',
      'Avoid subprocess.run(..., shell=True) when arguments contain user input; pass arguments as an explicit argument list.',
      'Do not use pickle.loads() or yaml.load() on untrusted inputs; use safe loaders (yaml.safe_load) or JSON.',
    ],
  },
  {
    id: 'ocr-py-context-resources',
    path: '**/*.py',
    language: 'Python',
    category: 'maintainability',
    title: 'Context Managers & Thread Safety',
    description: 'Enforce deterministic cleanup with with blocks and thread-safe shared state.',
    checklist: [
      'Always wrap files, network connections, and database sessions in with context managers.',
      'Protect mutable shared state accessed across threads with threading.Lock or threading.RLock.',
      'In asyncio code, avoid blocking CPU-bound or synchronous I/O operations without run_in_executor.',
    ],
  },

  // Go
  {
    id: 'ocr-go-nil-safety',
    path: '**/*.go',
    language: 'Go',
    category: 'bug',
    title: 'Nil Pointer Dereference & Error Handling',
    description: 'Prevent runtime panics caused by nil pointer dereferences or ignored error values.',
    checklist: [
      'Always check if err != nil before accessing result objects or pointers.',
      'Verify pointers and interface instances are non-nil before method invocation or type assertion.',
      'Check the second boolean value in map lookups (val, ok := m[key]) and type assertions (val, ok := x.(T)).',
    ],
  },
  {
    id: 'ocr-go-concurrency-goroutines',
    path: '**/*.go',
    language: 'Go',
    category: 'bug',
    title: 'Goroutine Leaks & Data Races',
    description: 'Prevent leaking goroutines, deadlocks on channels, and race conditions.',
    checklist: [
      'Ensure every spawned goroutine terminates deterministically via context.Context cancellation or done channels.',
      'Never send to or close an uninitialized (nil) channel.',
      'Protect shared structs and package-level state using sync.Mutex or sync.RWMutex, avoiding value copies of mutexes.',
      'Ensure WaitGroups match wg.Add() and wg.Done() counts strictly.',
    ],
  },
  {
    id: 'ocr-go-resource-cleanup',
    path: '**/*.go',
    language: 'Go',
    category: 'maintainability',
    title: 'Defer Cleanup Discipline',
    description: 'Guarantee proper closing of HTTP response bodies, file descriptors, and database rows.',
    checklist: [
      'Always defer resp.Body.Close() immediately after checking err == nil.',
      'Ensure deferred functions do not hide or discard critical errors in rollback/cleanup paths.',
    ],
  },

  // Rust
  {
    id: 'ocr-rust-panic-safety',
    path: '**/*.rs',
    language: 'Rust',
    category: 'bug',
    title: 'Panic Hardening & Error Propagation',
    description: 'Eliminate unhandled panics from .unwrap() and .expect() in non-test paths.',
    checklist: [
      'Avoid .unwrap() or .expect() in production paths; propagate errors using Result<T, E> and the ? operator.',
      'Verify array and slice indexing or use .get() to prevent out-of-bounds panics.',
      'Ensure match arms exhaustively handle failure modes without wildcards that silently drop errors.',
    ],
  },
  {
    id: 'ocr-rust-concurrency-locks',
    path: '**/*.rs',
    language: 'Rust',
    category: 'bug',
    title: 'Lock Contention & Deadlock Avoidance',
    description: 'Ensure Mutex and RwLock acquisitions are minimal, scoped, and deadlock-free.',
    checklist: [
      'Keep lock guards in the narrowest possible scope; avoid holding locks across async .await boundaries.',
      'Acquire locks in a consistent global order across multiple resources to prevent deadlocks.',
      'Audit unsafe blocks for valid pointer provenance, alignment, and absence of data races.',
    ],
  },

  // Java
  {
    id: 'ocr-java-npe-thread-safety',
    path: '**/*.java',
    language: 'Java',
    category: 'bug',
    title: 'NullPointer & Concurrency Invariants',
    description: 'Prevent NullPointerException and multithreaded race conditions.',
    checklist: [
      'Validate method parameters with Objects.requireNonNull() or @NonNull annotations.',
      'Check Optional.isPresent() before calling .get(), or use .orElse() / .map().',
      'Synchronize mutable shared state or use java.util.concurrent concurrent collections and Atomic variables.',
      'Mark fields accessed by multiple threads as volatile if memory visibility is required without synchronization.',
    ],
  },
  {
    id: 'ocr-java-security-sql-injection',
    path: '**/*.java',
    language: 'Java',
    category: 'security',
    title: 'SQLi & Resource Management',
    description: 'Enforce prepared statements and try-with-resources.',
    checklist: [
      'Use PreparedStatement or parameterized JPA/MyBatis queries (#{} instead of ${}) to prevent SQL injection.',
      'Always use try-with-resources for Connection, Statement, ResultSet, and Stream objects.',
    ],
  },

  // SQL & Database
  {
    id: 'ocr-sql-integrity',
    path: '**/*.{sql,ddl}',
    language: 'SQL',
    category: 'bug',
    title: 'SQL Invariants & Migration Safety',
    description: 'Ensure index coverage, transaction safety, and non-destructive schema migrations.',
    checklist: [
      'Verify that foreign keys and frequently filtered/joined columns have corresponding indexes.',
      'Ensure schema migrations are backward compatible with running applications (expand-contract pattern).',
      'Wrap data and schema mutations in transactions where supported by the target engine.',
      'Avoid locking entire tables during peak operations; use concurrent index creation where applicable.',
    ],
  },
];
