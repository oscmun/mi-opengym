// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Slider } from './ui.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

// The Slider scales from inline-start: min sits on the left in LTR and on the right in
// RTL. These cases pin the RTL behaviour — the pointer math, the fill direction's
// arithmetic twin and the arrow keys — the parts that would silently break if the
// direction handling were dropped.

let root
let container

// happy-dom has no layout, so the track's physical rect is faked; the slider only
// reads left/width out of it.
const RECT = { left: 0, right: 200, top: 0, bottom: 32, width: 200, height: 32, x: 0, y: 0, toJSON: () => ({}) }

function render(onChange) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<Slider value={50} min={0} max={100} step={1} onChange={onChange} />))
  const el = container.querySelector('.sld')
  el.getBoundingClientRect = () => RECT
  el.setPointerCapture = () => {}
  return el
}

function pointerDown(el, clientX) {
  act(() => {
    const e = new Event('pointerdown', { bubbles: true })
    Object.defineProperty(e, 'clientX', { value: clientX })
    el.dispatchEvent(e)
  })
}

function key(el, keyName) {
  act(() => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: keyName, bubbles: true }))
  })
}

beforeEach(() => {
  document.documentElement.dir = 'rtl'
})

afterEach(() => {
  document.documentElement.dir = 'ltr'
  if (root) act(() => root.unmount())
  if (container) container.remove()
  root = null
  container = null
})

describe('Slider under dir=rtl', () => {
  it('reads the pointer from the physical right: the left end is near max, the right end near min', () => {
    const onChange = vi.fn()
    const el = render(onChange)
    // clientX 10 of a 200px track: f = .05 → mirrored .95 → 95.
    pointerDown(el, 10)
    expect(onChange).toHaveBeenLastCalledWith(95)
    // clientX 190: f = .95 → mirrored .05 → 5.
    pointerDown(el, 190)
    expect(onChange).toHaveBeenLastCalledWith(5)
  })

  it('swaps the horizontal arrows in RTL and keeps the vertical arrows as they are', () => {
    const onChange = vi.fn()
    const el = render(onChange)
    // The arrow toward the inline-end (max) still increases — that is Left in RTL.
    key(el, 'ArrowLeft')
    expect(onChange).toHaveBeenLastCalledWith(51)
    key(el, 'ArrowRight')
    expect(onChange).toHaveBeenLastCalledWith(49)
    key(el, 'ArrowUp')
    expect(onChange).toHaveBeenLastCalledWith(51)
    key(el, 'ArrowDown')
    expect(onChange).toHaveBeenLastCalledWith(49)
  })
})
