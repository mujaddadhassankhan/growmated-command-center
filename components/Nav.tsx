'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const links = [
  { href: '/',                label: 'Dashboard'      },
  { href: '/activity',        label: '⚡ Activity'    },
  { href: '/conversations',   label: '💬 Convos'      },
  { href: '/templates',        label: '📋 Templates'       },
  { href: '/content-calendar', label: '📅 Content Cal'    },
  { href: '/clients',          label: 'Clients'            },
  { href: '/pipeline',        label: 'Pipeline'       },
  { href: '/finances',        label: 'Finances'       },
  { href: '/time',            label: 'Time Log'       },
  { href: '/goals',           label: 'Goals'          },
]

export default function Nav() {
  const path = usePathname()
  const [isPrivate, setIsPrivate] = useState(true) // privacy ON by default

  useEffect(() => {
    // Read stored preference
    const stored = localStorage.getItem('cc_privacy')
    const initial = stored !== 'off' // default: private
    setIsPrivate(initial)
  }, [])

  function togglePrivacy() {
    const next = !isPrivate
    setIsPrivate(next)
    localStorage.setItem('cc_privacy', next ? 'on' : 'off')
    window.dispatchEvent(new CustomEvent('privacy-toggle', { detail: { reveal: !next } }))
  }

  return (
    <div className="hdr sticky top-0 z-40 shadow-lg shadow-black/30">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-2">
          <div className="w-6 h-6 rounded-md bg-white/15 flex items-center justify-center">
            <span className="text-white text-xs font-bold">G</span>
          </div>
          <span className="font-semibold tracking-tight text-white text-sm whitespace-nowrap" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Command Center
          </span>
        </div>

        {/* Nav links */}
        <div className="flex flex-wrap gap-1 flex-1">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm text-white/75 hover:text-white hover:bg-white/10 transition-all',
                path === l.href && 'bg-white/15 text-white font-medium'
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Privacy toggle */}
        <button
          onClick={togglePrivacy}
          title={isPrivate ? 'Values hidden — click to reveal all' : 'Click to hide sensitive values'}
          className={cn(
            'ml-2 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
            isPrivate
              ? 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
              : 'bg-white/20 text-white hover:bg-white/25'
          )}
        >
          {isPrivate ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
              Private
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Revealed
            </>
          )}
        </button>
      </div>
    </div>
  )
}
