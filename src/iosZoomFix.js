// Mobile Safari aggressively zooms form controls, double taps, and pinch gestures.
// The CSS still keeps controls readable at 16px; this file prevents the viewport
// from being left enlarged after iOS interaction.

const IOS_PATTERN = /iPad|iPhone|iPod/
const isIOS = IOS_PATTERN.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

if (isIOS) {
  const viewport = document.querySelector('meta[name="viewport"]') ||
    document.head.appendChild(document.createElement('meta'))

  viewport.setAttribute('name', 'viewport')
  viewport.setAttribute(
    'content',
    'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
  )

  const preventGesture = (event) => event.preventDefault()
  document.addEventListener('gesturestart', preventGesture, { passive: false })
  document.addEventListener('gesturechange', preventGesture, { passive: false })
  document.addEventListener('gestureend', preventGesture, { passive: false })

  let lastTouchEnd = 0
  document.addEventListener(
    'touchend',
    (event) => {
      const now = Date.now()
      if (now - lastTouchEnd <= 300) event.preventDefault()
      lastTouchEnd = now
    },
    { passive: false }
  )
}
