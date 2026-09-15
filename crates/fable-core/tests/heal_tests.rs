use fable_core::heal::*;
use std::path::PathBuf;

#[test]
fn test_generate_suggested_test_for_categories() {
    let sql_test = generate_suggested_test(
        "sql-injection",
        "http://localhost:3000/api/users",
        "SQL Injection",
    );
    assert!(sql_test.contains("SQL injection probe safely rejected"));

    let cors_test = generate_suggested_test(
        "cors-misconfiguration",
        "http://localhost:3000/api/data",
        "CORS Misconfig",
    );
    assert!(cors_test.contains("CORS rejects unauthorized arbitrary origins"));

    let idor_test =
        generate_suggested_test("idor-bola", "http://localhost:3000/api/docs/123", "BOLA");
    assert!(idor_test.contains("rejects unauthorized cross-tenant access"));

    let headers_test = generate_suggested_test(
        "security-headers",
        "http://localhost:3000",
        "Missing Headers",
    );
    assert!(headers_test.contains("enforce security headers"));

    let sensitive_test = generate_suggested_test(
        "sensitive-exposure",
        "http://localhost:3000/.env",
        "Leaked env",
    );
    assert!(sensitive_test.contains("sensitive path"));
}

#[test]
fn test_synthesize_code_patch_sql_parameterization() {
    let vulnerable_code =
        "const result = await db.query(`SELECT * FROM users WHERE id = ${userId}`);";
    let patch = synthesize_code_patch("sql-injection", vulnerable_code);
    assert!(patch.is_some());
    let (strategy, orig, patched) = patch.unwrap();
    assert_eq!(strategy, "sql-parameterization");
    assert!(orig.contains("userId"));
    assert!(patched.contains("queryParameterized($1, [userId])"));
}

#[test]
fn test_synthesize_code_patch_cors_whitelist() {
    let vulnerable_code = "res.setHeader('Access-Control-Allow-Origin', '*');";
    let patch = synthesize_code_patch("cors-misconfiguration", vulnerable_code);
    assert!(patch.is_some());
    let (strategy, orig, patched) = patch.unwrap();
    assert_eq!(strategy, "strict-cors-whitelist");
    assert!(orig.contains("*"));
    assert!(patched.contains("ALLOWED_ORIGIN"));
}

#[test]
fn test_plan_healing_dry_run() {
    let findings = vec![RedTeamFindingInput {
        id: "FT-SQL-1".to_string(),
        fingerprint: Some("fp-sql-1".to_string()),
        category: "sql-injection".to_string(),
        severity: "critical".to_string(),
        title: "SQL Injection on /api/user".to_string(),
        description: "Unescaped user input".to_string(),
        target: "http://localhost:3000/api/user".to_string(),
        cwe: Some("CWE-89".to_string()),
        remediation: Some("Parameterize query".to_string()),
        evidence: None,
    }];
    let report = plan_healing(&findings, &PathBuf::from("."), true);
    assert!(report.ok);
    assert_eq!(report.total_findings, 1);
    assert_eq!(report.patches_generated, 1);
    assert_eq!(report.patches_applied, 0); // dry run!
    assert!(!report.attestation_sha256.is_empty());
}
