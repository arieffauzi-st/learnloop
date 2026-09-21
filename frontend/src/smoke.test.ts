import { describe, expect, it } from 'vitest'
import { mountApp } from './main'

describe('smoke', () => {
  it('mounts the app without throwing', () => {
    const container = document.createElement('div')
    expect(() => mountApp(container)).not.toThrow()
    expect(container.querySelector('#root')).toBeNull()
  })
})
