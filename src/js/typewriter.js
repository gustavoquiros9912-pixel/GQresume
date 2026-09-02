const DEFAULT_SPEED = 45

export function typewriter(el, options = {}) {
  const {
    delay = 0,
    speed = DEFAULT_SPEED,
    text = el.dataset.typewriterText ?? el.textContent.trim(),
  } = options

  return new Promise((resolve) => {
    if (!el || !text) {
      resolve()
      return
    }

    el.textContent = ''
    el.setAttribute('aria-label', text)

    let i = 0
    let last = 0

    const tick = (now) => {
      if (now - last >= speed) {
        if (i < text.length) {
          el.textContent += text[i]
          i += 1
          last = now
        }
      }
      if (i < text.length) {
        requestAnimationFrame(tick)
      } else {
        resolve()
      }
    }

    const start = () => requestAnimationFrame(tick)

    if (delay > 0) setTimeout(start, delay)
    else start()
  })
}

export async function typewriterSequence(elements, gap = 280) {
  for (let n = 0; n < elements.length; n += 1) {
    await typewriter(elements[n])
    if (n < elements.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, gap))
    }
  }
}

export function initTypewriter() {
  document
    .querySelectorAll('[data-typewriter]:not([data-typewriter-defer])')
    .forEach((el) => {
      if (!el.dataset.typewriterText) {
        el.dataset.typewriterText = el.textContent.trim()
      }
      typewriter(el, { delay: 400 })
    })
}
