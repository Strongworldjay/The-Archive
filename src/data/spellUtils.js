export const slugify = (value = '') =>
  value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export const compactSpellKey = (value = '') => slugify(value).replaceAll('-', '')

export const spellImgUrl = (value = '') => `/assets/spells/spells/${compactSpellKey(value)}.png`

export const schoolFallbackUrl = (school = '') => `/assets/spells/spells/${compactSpellKey(school || 'generic')}.png`

export const getSpellImage = (spell) => spell.imagePath || spellImgUrl(spell.slug || spell.name)

export const levelLabel = (level) => (level === 0 ? 'Cantrip' : `${ordinal(level)} Level`)

const ordinal = (value) => {
  const n = Number(value)
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`
  if (n % 10 === 1) return `${n}st`
  if (n % 10 === 2) return `${n}nd`
  if (n % 10 === 3) return `${n}rd`
  return `${n}th`
}
