"use client"

import { useRef, useEffect, useCallback } from 'react'

interface SwipeConfig {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number  // Minimum distance for swipe (default: 50px)
  enabled?: boolean
}

interface TouchState {
  startX: number
  startY: number
  startTime: number
  isInsideScrollable: boolean  // Track if touch started in scrollable element
}

/**
 * Check if an element or its parents can scroll horizontally
 * Used to prevent swipe gestures from triggering when scrolling code blocks
 */
function isInsideHorizontallyScrollable(element: HTMLElement | null): boolean {
  let current = element
  while (current) {
    // Check for code blocks, pre elements, or elements with horizontal scroll
    const tagName = current.tagName.toLowerCase()
    if (tagName === 'pre' || tagName === 'code') {
      return true
    }

    // Check if element has horizontal overflow
    const style = window.getComputedStyle(current)
    const overflowX = style.overflowX
    if (overflowX === 'auto' || overflowX === 'scroll') {
      // Check if content is actually scrollable (scrollWidth > clientWidth)
      if (current.scrollWidth > current.clientWidth) {
        return true
      }
    }

    current = current.parentElement
  }
  return false
}

/**
 * Hook to detect swipe gestures on touch devices
 *
 * Usage:
 *   const swipeRef = useSwipeGestures({
 *     onSwipeLeft: () => nextPhase(),
 *     onSwipeRight: () => previousPhase(),
 *     enabled: isMobile,
 *   })
 *
 *   return <div ref={swipeRef}>...</div>
 */
export function useSwipeGestures<T extends HTMLElement = HTMLDivElement>({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  enabled = true,
}: SwipeConfig) {
  const ref = useRef<T>(null)
  const touchState = useRef<TouchState | null>(null)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return
    const touch = e.touches[0]
    const target = e.target as HTMLElement

    // Check if touch started inside a horizontally scrollable element (like code blocks)
    const isInsideScrollable = isInsideHorizontallyScrollable(target)

    touchState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      isInsideScrollable,
    }
  }, [enabled])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled || !touchState.current) return

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchState.current.startX
    const deltaY = touch.clientY - touchState.current.startY
    const deltaTime = Date.now() - touchState.current.startTime
    const wasInsideScrollable = touchState.current.isInsideScrollable

    // Reset touch state
    touchState.current = null

    // Must be fast enough (under 300ms) to be a swipe
    if (deltaTime > 300) return

    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    // Determine if horizontal or vertical swipe
    if (absX > absY && absX > threshold) {
      // Horizontal swipe - but skip if inside scrollable element (like code blocks)
      // This allows horizontal scrolling in code without triggering phase navigation
      if (wasInsideScrollable) return

      if (deltaX > 0) {
        onSwipeRight?.()
      } else {
        onSwipeLeft?.()
      }
    } else if (absY > absX && absY > threshold) {
      // Vertical swipe
      if (deltaY > 0) {
        onSwipeDown?.()
      } else {
        onSwipeUp?.()
      }
    }
  }, [enabled, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown])

  useEffect(() => {
    const element = ref.current
    if (!element || !enabled) return

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enabled, handleTouchStart, handleTouchEnd])

  return ref
}

export default useSwipeGestures
