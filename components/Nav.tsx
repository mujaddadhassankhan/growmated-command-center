'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/clients', label: 'Clients' },
  { href: '/pipeline', label: 'Pipeline' },
  { href: '/finances', label: 'Finances' },
  { href: '/time', label: 'Time Log' },
  { href: '/goals', label: 'Goals & Focus' },
]

export default function Nav() {
  const path = usePathname()
  return (
    <div className="hdr">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
        <div className="font-semibold tracking-tight">Growmated Command Center</div>
        <div className="ml-auto flex flex-wrap gap-2">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'rounded-xl px-3 py-1.5 text-sm text-white/90 hover:text-white hover:bg-white/10 transition',
                path === l.href && 'bg-white/15 text-white'
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
