/** Colors the admin can tap instead of typing. Order here is the order they're offered in. */
export const PRESET_COLORS: { name: string; hex: string }[] = [
  { name: 'Black', hex: '#111111' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Cream', hex: '#f3ead8' },
  { name: 'Beige', hex: '#d9c3a0' },
  { name: 'Brown', hex: '#7a5232' },
  { name: 'Gray', hex: '#9ca3af' },
  { name: 'Red', hex: '#c0262d' },
  { name: 'Pink', hex: '#f2a7bd' },
  { name: 'Orange', hex: '#ea7a24' },
  { name: 'Yellow', hex: '#f2c94c' },
  { name: 'Green', hex: '#3f7d4e' },
  { name: 'Blue', hex: '#3b6fd8' },
  { name: 'Navy', hex: '#1f2a52' },
  { name: 'Purple', hex: '#7b4fa8' },
]

export function presetColor(name: string) {
  const key = name.trim().toLowerCase()
  return PRESET_COLORS.find((c) => c.name.toLowerCase() === key) ?? null
}
