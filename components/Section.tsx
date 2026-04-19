import { ReactNode } from 'react'

export default function Section({ title, children, right }: { title: string, children: ReactNode, right?: ReactNode }) {
  return (
    <div className="card">
      <div className="hdr rounded-t-2xl px-4 py-3 flex items-center gap-3">
        <div className="font-semibold">{title}</div>
        <div className="ml-auto">{right}</div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}
