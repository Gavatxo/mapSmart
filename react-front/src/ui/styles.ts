import type { CSSProperties } from 'react'

export const s: Record<string, CSSProperties> = {
  muted: { color: '#637083', fontSize: 13, margin: 0 },
  section: { padding: 16, borderBottom: '1px solid #eef2f7', display: 'flex', flexDirection: 'column', gap: 8 },
  sectionTitle: { margin: 0, fontSize: 14 },
  field: { height: 40, padding: '0 10px', border: '1px solid #dce3ec', borderRadius: 9, minWidth: 0 },
  row: { display: 'flex', gap: 8, alignItems: 'center' },
  primary: { height: 42, border: 0, borderRadius: 10, background: '#1769e0', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  secondary: { height: 40, padding: '0 12px', border: '1px solid #dce3ec', borderRadius: 9, background: '#fff', cursor: 'pointer' },
  ghost: { border: 0, background: 'none', color: '#637083', cursor: 'pointer', fontSize: 13, padding: 4 },
  danger: { border: 0, background: 'none', color: '#dc4c58', cursor: 'pointer', fontSize: 13, padding: 4 },
  icon: { width: 42, height: 40, border: 0, borderRadius: 9, background: '#11243e', color: '#fff', cursor: 'pointer' },
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 },
  item: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 8, background: '#f4f7fb', fontSize: 13 },
  grow: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
}
