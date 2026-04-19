'use client'

import { type ReactNode, useEffect, useState } from 'react'

/**
 * Wraps a monetary/sensitive value.
 * - Blurred by default (privacy ON)
 * - Click to toggle reveal for this individual value
 * - Responds to global privacy-toggle event from Nav
 */
export default function Sensitive({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  const [globalReveal, setGlobalReveal] = useState(false)
  const [localReveal, setLocalReveal]   = useState(false)

  useEffect(() => {
    // Sync with stored preference on mount
    const stored = localStorage.getItem('cc_privacy')
    setGlobalReveal(stored === 'off')

    function handler(e: Event) {
      const reveal = (e as CustomEvent<{ reveal: boolean }>).detail.reveal
      setGlobalReveal(reveal)
      if (!reveal) setLocalReveal(false) // re-hide individual reveals on global lock
    }
    window.addEventListener('privacy-toggle', handler)
    return () => window.removeEventListener('privacy-toggle', handler)
  }, [])

  const visible = globalReveal || localReveal

  return (
    <span
      className={`${visible ? 'sensitive-clear' : 'sensitive-blur'} ${className}`}
      onClick={e => {
        e.stopPropagation()
        setLocalReveal(r => !r)
      }}
      title={visible ? 'Click to hide' : 'Click to reveal'}
    >
      {children}
    </span>
  )
}
