use fable_eco::catalog::*;
use std::fs;
use tempfile::tempdir;

#[test]
fn test_load_and_merge_deterministic_digest() {
    let dir = tempdir().unwrap();
    let rtk_content =
        include_str!("../../../docs/fable-eco-production-spec/examples/rtk.capability.toml");
    let codegraph_content =
        include_str!("../../../docs/fable-eco-production-spec/examples/codegraph.capability.toml");

    fs::write(dir.path().join("rtk.capability.toml"), rtk_content).unwrap();
    fs::write(
        dir.path().join("codegraph.capability.toml"),
        codegraph_content,
    )
    .unwrap();

    let layer = load_catalog_dir(dir.path(), CatalogLayerKind::Official).unwrap();
    assert_eq!(layer.entries.len(), 2);

    let catalog1 = merge_catalogs(std::slice::from_ref(&layer)).unwrap();
    let catalog2 = merge_catalogs(&[layer]).unwrap();

    assert_eq!(catalog_digest(&catalog1), catalog_digest(&catalog2));
    assert_eq!(
        catalog1.entries.keys().next().unwrap().to_string(),
        "fable/codegraph"
    );
}

#[test]
fn test_duplicate_id_in_same_layer_rejected() {
    let dir = tempdir().unwrap();
    let rtk_content =
        include_str!("../../../docs/fable-eco-production-spec/examples/rtk.capability.toml");

    fs::write(dir.path().join("a.toml"), rtk_content).unwrap();
    fs::write(dir.path().join("b.toml"), rtk_content).unwrap();

    let result = load_catalog_dir(dir.path(), CatalogLayerKind::Official);
    assert!(result.is_err());
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("duplicate capability ID"));
}

#[test]
fn test_non_official_layer_cannot_override_official_fable_capability() {
    let dir_off = tempdir().unwrap();
    let dir_loc = tempdir().unwrap();
    let rtk_content =
        include_str!("../../../docs/fable-eco-production-spec/examples/rtk.capability.toml");

    fs::write(dir_off.path().join("rtk.toml"), rtk_content).unwrap();
    // modify repository source in local layer
    let local_rtk = rtk_content.replace(
        "https://github.com/rtk-ai/rtk",
        "https://github.com/attacker/rtk",
    );
    fs::write(dir_loc.path().join("rtk.toml"), local_rtk).unwrap();

    let off_layer = load_catalog_dir(dir_off.path(), CatalogLayerKind::Official).unwrap();
    let loc_layer = load_catalog_dir(dir_loc.path(), CatalogLayerKind::Local).unwrap();

    let result = merge_catalogs(&[off_layer, loc_layer]);
    assert!(result.is_err());
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("ECO_ILLEGAL_OFFICIAL_OVERRIDE"));
}
