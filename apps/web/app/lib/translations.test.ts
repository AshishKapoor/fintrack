import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Every `t('some.key')` in the app exists in every shipped language.
 *
 * A missing key doesn't fail anything at runtime - i18next just renders the
 * key itself ("reportResult.moneyIn") in the middle of the page. This turns
 * that into a test failure instead.
 */

const APP_DIR = resolve(__dirname, '..')
const LOCALES_DIR = resolve(__dirname, '../../public/locales')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === 'gen' ? [] : sourceFiles(path)
    return /\.(tsx?|jsx?)$/.test(name) && !/\.test\./.test(name) ? [path] : []
  })
}

function usedKeys(): string[] {
  const keys = new Set<string>()
  for (const file of sourceFiles(APP_DIR)) {
    for (const match of readFileSync(file, 'utf8').matchAll(/\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]/g)) {
      keys.add(match[1])
    }
  }
  return [...keys].sort()
}

function hasKey(catalogue: Record<string, unknown>, key: string): boolean {
  let node: unknown = catalogue
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return false
    const record = node as Record<string, unknown>
    if (part in record) node = record[part]
    // Plurals are stored as key_one / key_other.
    else if (`${part}_one` in record || `${part}_other` in record) return true
    else return false
  }
  return true
}

describe('translations', () => {
  const keys = usedKeys()

  it('finds the keys the app uses', () => {
    expect(keys.length).toBeGreaterThan(100)
  })

  for (const language of readdirSync(LOCALES_DIR)) {
    it(`${language} has every key the app uses`, () => {
      const catalogue = JSON.parse(
        readFileSync(join(LOCALES_DIR, language, 'translation.json'), 'utf8'),
      ) as Record<string, unknown>
      expect(keys.filter((key) => !hasKey(catalogue, key))).toEqual([])
    })
  }
})
