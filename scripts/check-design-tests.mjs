// Run with: node --test scripts/check-design-tests.mjs
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkSource } from './check-design.mjs'

function rules(source, file = 'src/Pages/Demo.jsx') {
  const problems = []
  checkSource(file, source, 'all', {}, problems)
  return problems.map((p) => p.rule)
}

test('theme classes and variables pass', () => {
  assert.deepEqual(rules(`<p className="text-white" />`), [])
  assert.deepEqual(rules(`<div className="rounded-xl border bg-card p-5 bg-[var(--background)]">Users</div>`), [])
})

test('hex, palette and arbitrary values fail', () => {
  assert.deepEqual(rules(`<path stroke="#3157D5" />`), ['no-hex'])
  assert.deepEqual(rules(`<div className="bg-slate-800 text-gray-500" />`), ['no-palette', 'no-palette'])
  assert.deepEqual(rules(`<div className="p-[13px]" />`), ['no-arbitrary'])
})

test('the status color pairs from DESIGN.md are allowed', () => {
  assert.deepEqual(rules(`<span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />`), [])
  assert.deepEqual(rules(`<span className="bg-amber-500/10 text-amber-700 dark:text-amber-400" />`), [])
  assert.deepEqual(rules(`<span className="bg-green-100 text-red-700" />`), ['no-palette', 'no-palette'])
})

test('browser dialogs fail', () => {
  assert.deepEqual(rules(`if (window.confirm("Delete?")) remove()`, 'src/lib/a.js'), ['no-browser-dialog'])
})

test('English text is fine here, because the console has no translations', () => {
  assert.deepEqual(rules(`<h1>Monthly report</h1>`), [])
})

test('a design-system-ignore comment allows the next line', () => {
  assert.deepEqual(rules(`{/* design-system-ignore: brand logo */}\n<path fill="#3157D5" />`), [])
})
