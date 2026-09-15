import { describe, expect, test } from 'vitest'
import { matchesShortcut, toAriaKeyShortcut } from './shortcuts.ts'

function key(
  code: string,
  keyValue: string,
  modifiers: Partial<{
    ctrl: boolean
    shift: boolean
    alt: boolean
    meta: boolean
  }> = {},
) {
  return {
    code,
    key: keyValue,
    ctrlKey: modifiers.ctrl ?? false,
    shiftKey: modifiers.shift ?? false,
    altKey: modifiers.alt ?? false,
    metaKey: modifiers.meta ?? false,
  }
}

describe('matchesShortcut', () => {
  test('matches letters by physical key with Ctrl or Command', () => {
    expect(matchesShortcut(key('KeyK', 'k', { ctrl: true }), 'Ctrl+K')).toBe(
      true,
    )
    expect(matchesShortcut(key('KeyK', 'k', { meta: true }), 'Ctrl+K')).toBe(
      true,
    )
    expect(matchesShortcut(key('KeyK', 'k'), 'Ctrl+K')).toBe(false)
  })

  test('requires the exact modifier set', () => {
    expect(
      matchesShortcut(
        key('KeyZ', 'Z', { ctrl: true, shift: true }),
        'Ctrl+Shift+Z',
      ),
    ).toBe(true)
    expect(
      matchesShortcut(key('KeyZ', 'Z', { ctrl: true, shift: true }), 'Ctrl+Z'),
    ).toBe(false)
  })

  test('matches digits by physical key even when Alt changes the character', () => {
    expect(matchesShortcut(key('Digit1', '¡', { alt: true }), 'Alt+1')).toBe(
      true,
    )
  })

  test('matches named keys', () => {
    expect(
      matchesShortcut(key('Enter', 'Enter', { ctrl: true }), 'Ctrl+Enter'),
    ).toBe(true)
  })
})

test('spells shortcuts for aria-keyshortcuts', () => {
  expect(toAriaKeyShortcut('Ctrl+Shift+Z')).toBe('Control+Shift+Z')
})
