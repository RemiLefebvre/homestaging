// Post-build fix for sharp on Vercel.
//
// Nitro's file tracer bundles sharp's native `.node` addon into the Vercel
// function, but it cannot follow the native dlopen() the addon makes to
// `libvips-cpp.so` in `@img/sharp-libvips-linux-x64`. The function therefore
// ships without the shared object and crashes at runtime with
// `ERR_DLOPEN_FAILED: libvips-cpp.so.8.18.3` on linux-x64.
//
// This script runs AFTER `nuxt build` (see the "build" script) and copies the
// libvips package into each function's node_modules, right next to sharp's
// addon, where the addon's RPATH expects to find the .so. It must NOT live in
// nuxt.config.ts: putting a node:fs import / nitro `compiled` hook there breaks
// `vercel build`'s detection of the .vercel/output Build Output directory.
//
// No-ops cleanly when there is no .vercel/output (e.g. local `nuxt build` with
// the node-server preset), and when the linux libvips package isn't installed.

import { cpSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const PKG = '@img/sharp-libvips-linux-x64'
const root = process.cwd()

/** Locate the installed libvips-linux-x64 package dir (pnpm store or hoisted). */
function findLibvipsLinuxDir() {
  const candidates = []
  const store = join(root, 'node_modules', '.pnpm')
  if (existsSync(store)) {
    for (const entry of readdirSync(store)) {
      if (entry.startsWith('@img+sharp-libvips-linux-x64@')) {
        candidates.push(join(store, entry, 'node_modules', PKG))
      }
    }
  }
  candidates.push(join(root, 'node_modules', PKG)) // hoisted / npm layout
  return candidates.find(dir => existsSync(join(dir, 'lib')))
}

/** Every Vercel function dir that bundles sharp's linux-x64 addon. */
function findFunctionDirs() {
  const fnRoot = join(root, '.vercel', 'output', 'functions')
  if (!existsSync(fnRoot)) return []
  return readdirSync(fnRoot)
    .filter(name => name.endsWith('.func'))
    .map(name => join(fnRoot, name))
    .filter(dir => existsSync(join(dir, 'node_modules', '@img', 'sharp-linux-x64')))
}

const src = findLibvipsLinuxDir()
if (!src) {
  console.warn(`[copy-libvips] ${PKG} not installed — nothing to copy (ok off-linux builds).`)
  process.exit(0)
}

const targets = findFunctionDirs()
if (targets.length === 0) {
  console.warn('[copy-libvips] no .vercel/output function bundles sharp — skipping (ok for non-vercel builds).')
  process.exit(0)
}

for (const fn of targets) {
  const dest = join(fn, 'node_modules', '@img', 'sharp-libvips-linux-x64')
  cpSync(src, dest, { recursive: true, dereference: true })
  const so = join(dest, 'lib')
  const copied = existsSync(so) ? readdirSync(so).find(f => f.startsWith('libvips-cpp.so')) : undefined
  console.log(`[copy-libvips] ${copied ?? 'lib'} -> ${dest}`)
}
