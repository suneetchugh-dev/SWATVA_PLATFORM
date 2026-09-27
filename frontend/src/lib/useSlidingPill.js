import { useCallback, useLayoutEffect, useRef, useState } from 'react'

/**
 * Shared highlight transition for a row of exclusive options.
 *
 * One pill is measured behind whichever item is current and then transitioned
 * between them, so the highlight travels across instead of blinking out and in.
 * There is no animation library in the project, so the movement is a plain CSS
 * transition on transform/width/height.
 *
 * Used by the dashboard nav (both the desktop bar and the phone bottom bar) and
 * by the auth mode tabs, so the two stay in step visually.
 */

/** Applied to the pill. Exported so every consumer eases identically. */
export const PILL_TRANSITION =
  'transform 0.34s cubic-bezier(0.32, 0.72, 0, 1), width 0.34s cubic-bezier(0.32, 0.72, 0, 1), height 0.34s cubic-bezier(0.32, 0.72, 0, 1)'

/** Attribute the hook reads the active item's box from. */
export const PILL_ITEM_ATTR = 'data-pill-idx'

/**
 * @param {number}  count       number of items, so the hook re-measures if the
 *                              row ever changes length
 * @param {number}  activeIndex index of the current item
 * @param {string}  recalcKey   re-measure when something other than the index
 *                              changes the item widths — a language switch
 *                              relabels every item, and the pill would otherwise
 *                              keep the previous width
 */
export function useSlidingPill(count, activeIndex, recalcKey) {
  const trackRef = useRef(null)
  const [pill, setPill] = useState(null)

  const measure = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const item = track.querySelector(`[${PILL_ITEM_ATTR}="${activeIndex}"]`)
    if (!item) {
      setPill(null)
      return
    }
    setPill({
      x: item.offsetLeft,
      y: item.offsetTop,
      w: item.offsetWidth,
      h: item.offsetHeight,
    })
  }, [activeIndex])

  useLayoutEffect(() => {
    measure()
    // offsetWidth is 0 on the first paint if web fonts are still swapping in, so
    // re-measure once the font load settles rather than trusting frame one.
    const fonts = document.fonts?.ready
    if (fonts?.then) fonts.then(measure).catch(() => {})
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure, count, recalcKey])

  return { trackRef, pill }
}
