import { type ReactNode } from 'react'

export default function Section({
  title,
  children,
  right,
}: {
  title: string
  children: ReactNode
  right?: ReactNode
}) {
  return (
    <div className="card overflow-hidden">
      <div className="hdr px-5 py-3 flex items-center gap-3">
        <div className="text-xs font-semibold tracking-widest text-white/90 uppercase">{title}</div>
        {right && <div className="ml-auto">{right}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}
