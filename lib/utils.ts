import clsx from 'clsx'

export function cn(...args: any[]) {
  return clsx(args)
}

export type Status = 'Green' | 'Yellow' | 'Red'
export function statusBadgeClass(status?: string) {
  switch (status) {
    case 'Green': return 'badge badge-green'
    case 'Yellow': return 'badge badge-yellow'
    case 'Red': return 'badge badge-red'
    default: return 'badge bg-gray-100 text-gray-700'
  }
}
