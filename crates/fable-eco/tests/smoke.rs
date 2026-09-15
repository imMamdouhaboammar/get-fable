use fable_eco::schema_version;

#[test]
fn test_exposes_v1_schema_version() {
    assert_eq!(schema_version(), 1);
}
