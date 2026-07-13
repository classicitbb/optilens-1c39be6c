#!/usr/bin/env node
/**
 * Health check: verifies each app-email template registered in
 * supabase/functions/_shared/transactional-email-templates/registry.ts
 *   - has a corresponding .tsx file
 *   - the file exports `template` with `component`, `subject`, `displayName`, and `previewData`
 *   - preview-transactional-email edge function references the same registry
 *
 * Intended to run in CI after each deployment. Non-zero exit on any failure.
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const templatesDir = resolve(root, 'supabase/functions/_shared/transactional-email-templates')
const registryPath = resolve(templatesDir, 'registry.ts')
const previewFnPath = resolve(root, 'supabase/functions/preview-transactional-email/index.ts')

const errors = []
const ok = (msg) => console.log(`\u2713 ${msg}`)
const fail = (msg) => { errors.push(msg); console.error(`\u2717 ${msg}`) }

if (!existsSync(registryPath)) {
  fail(`registry.ts missing at ${registryPath}`)
  process.exit(1)
}

const registrySrc = readFileSync(registryPath, 'utf8')

// Parse the TEMPLATES map: keys and their imported module basenames
const importMap = new Map() // localName -> relative path
for (const m of registrySrc.matchAll(/import\s+\{\s*template\s+as\s+(\w+)\s*\}\s+from\s+'(\.\/[^']+)'/g)) {
  importMap.set(m[1], m[2])
}

const templateBlock = registrySrc.match(/TEMPLATES:\s*Record<[^>]+>\s*=\s*\{([\s\S]*?)\}/)
if (!templateBlock) {
  fail('Could not locate TEMPLATES map in registry.ts')
  process.exit(1)
}

const entries = []
for (const m of templateBlock[1].matchAll(/'([\w-]+)'\s*:\s*(\w+)/g)) {
  entries.push({ name: m[1], local: m[2] })
}

if (entries.length === 0) {
  fail('No templates registered in TEMPLATES map')
}

for (const { name, local } of entries) {
  const rel = importMap.get(local)
  if (!rel) { fail(`${name}: no import for local '${local}'`); continue }
  const filePath = resolve(templatesDir, rel.replace(/^\.\//, ''))
  if (!existsSync(filePath)) { fail(`${name}: file missing (${rel})`); continue }
  const src = readFileSync(filePath, 'utf8')
  const problems = []
  if (!/export\s+const\s+template\b/.test(src)) problems.push('missing `export const template`')
  if (!/component\s*:/.test(src)) problems.push('missing `component`')
  if (!/subject\s*:/.test(src)) problems.push('missing `subject`')
  if (!/displayName\s*:/.test(src)) problems.push('missing `displayName` (needed for Cloud → Emails label)')
  if (!/previewData\s*:/.test(src)) problems.push('missing `previewData` (Cloud → Emails preview will fail)')
  if (problems.length) fail(`${name}: ${problems.join(', ')}`)
  else ok(`${name}: registered and preview-ready`)
}

// Sanity check the preview edge function imports the same registry
if (!existsSync(previewFnPath)) {
  fail('preview-transactional-email/index.ts missing')
} else {
  const previewSrc = readFileSync(previewFnPath, 'utf8')
  if (!/from\s+'\.\.\/_shared\/transactional-email-templates\/registry\.ts'/.test(previewSrc)) {
    fail('preview-transactional-email does not import the shared TEMPLATES registry')
  } else {
    ok('preview-transactional-email imports shared TEMPLATES registry')
  }
  if (/@supabase\/supabase-js@2\/cors/.test(previewSrc)) {
    fail("preview-transactional-email imports invalid 'npm:@supabase/supabase-js@2/cors' (module does not exist) — inline corsHeaders instead")
  }
}

if (errors.length) {
  console.error(`\nEmail preview health check failed: ${errors.length} issue(s).`)
  process.exit(1)
}
console.log(`\nAll ${entries.length} app-email templates are preview-ready.`)
