#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const tag = process.argv.find(a => a.startsWith('--tag='))?.slice('--tag='.length) || `v${readJson('release/validator-metadata.json').validator_version}`
const majorTag = process.argv.find(a => a.startsWith('--major-tag='))?.slice('--major-tag='.length) || ''
const expectedMajorTarget = process.argv.find(a => a.startsWith('--expected-major-target='))?.slice('--expected-major-target='.length) || ''

function fail(message) {
  console.error(`release verification failed: ${message}`)
  process.exit(1)
}
function sha256(data) { return createHash('sha256').update(data).digest('hex') }
function readJson(path) {
  if (!existsSync(path)) fail(`missing ${path}`)
  try { return JSON.parse(readFileSync(path, 'utf8')) } catch (err) { fail(`malformed ${path}: ${err.message}`) }
}
function requireString(obj, field, path) {
  if (typeof obj[field] !== 'string' || obj[field].trim() === '') fail(`${path} missing string ${field}`)
}
function tagTarget(name) {
  try { return execFileSync('git', ['rev-list', '-n', '1', name], { encoding: 'utf8' }).trim() } catch { fail(`cannot resolve tag ${name}`) }
}

const metadata = readJson('release/validator-metadata.json')
for (const field of ['validator_name', 'validator_version', 'canonical_algorithm_version', 'proof_schema_version', 'compatibility_range']) requireString(metadata, field, 'release/validator-metadata.json')
if (metadata.validator_name !== 'continuity-merge-guard') fail('unexpected validator_name')
if (metadata.validator_version !== 'development' && tag !== `v${metadata.validator_version}`) fail(`validator_version ${metadata.validator_version} does not match tag ${tag}`)
if (metadata.validator_version !== 'development' && (!metadata.canonical_algorithm_version || !metadata.proof_schema_version)) fail('published metadata is incomplete')

const changelog = existsSync('CHANGELOG.md') ? readFileSync('CHANGELOG.md', 'utf8') : fail('missing CHANGELOG.md')
if (!changelog.includes(`## [${metadata.validator_version}]`)) fail(`CHANGELOG.md lacks ${metadata.validator_version}`)

const manifest = readJson('release/RELEASE_MANIFEST.json')
if (!Array.isArray(manifest.files) || manifest.files.length === 0) fail('manifest has no files')
requireString(manifest, 'release_hash', 'release/RELEASE_MANIFEST.json')
requireString(manifest, 'source_commit', 'release/RELEASE_MANIFEST.json')
const sorted = [...manifest.files].sort((a, b) => a.path.localeCompare(b.path))
if (JSON.stringify(sorted) !== JSON.stringify(manifest.files)) fail('manifest paths are not sorted')
for (const entry of manifest.files) {
  requireString(entry, 'path', 'release manifest file entry')
  requireString(entry, 'sha256', `release manifest ${entry.path}`)
  if (!existsSync(entry.path)) fail(`runtime file missing: ${entry.path}`)
  const actual = sha256(readFileSync(entry.path))
  if (actual !== entry.sha256) fail(`runtime file hash differs: ${entry.path}`)
}
const aggregate = `sha256:${sha256(JSON.stringify({ files: manifest.files }))}`
if (aggregate !== manifest.release_hash) fail(`aggregate release hash differs: ${aggregate} !== ${manifest.release_hash}`)

if (majorTag || expectedMajorTarget) {
  if (!majorTag || !expectedMajorTarget) fail('major tag verification requires --major-tag and --expected-major-target')
  if (tagTarget(majorTag) !== tagTarget(expectedMajorTarget)) fail(`${majorTag} does not target ${expectedMajorTarget}`)
}
console.log(`release verification passed for ${tag} ${manifest.release_hash}`)
