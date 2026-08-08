# Changelog

All notable changes to this project will be documented in this file.

This project follows the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
format and uses semantic versioning when versioned releases are published.

## [Unreleased]

### Added

- Initial release planning, roadmap, and release-process documentation.
- Template validation script and documentation for local repository hygiene
  checks.
- Example generated repository shapes for minimal libraries, CLI tooling, and
  docs-only projects.
- Optional generated repository README template.
- Reusable agent prompt library for common OSS maintenance tasks.

### Changed

- Aligned template terminology, placeholder documentation, and current V1
  surface area across docs, templates, and workflows.
- Expanded the optional docs-site template with clearer setup guidance and a
  contributing starter page.
- Expanded template inventory checks and directory documentation to include the
  generated repository README template.
- Tightened template file validation and aligned generated workflow action
  versions.

### Fixed

- Updated the `nanoid` development dependency override to 3.3.17 to address
  [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8)
  and restore the CI release audit gate.
- Refreshed the `js-yaml` development dependency to address
  [GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj).
- Updated the `brace-expansion` override to 5.0.9 to address
  [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895).
- Load the CLI version from its TypeScript module instead of a JSON import
  attribute, and align the documented Node.js 20 minimum with the installed
  development toolchain at Node.js 20.19.

## Release Links

- Unreleased:
  `https://github.com/OWNER/REPOSITORY/compare/vLAST...HEAD`
- Latest release:
  `https://github.com/OWNER/REPOSITORY/releases/latest`

Replace `OWNER`, `REPOSITORY`, and `vLAST` after generating a project from this
template.
