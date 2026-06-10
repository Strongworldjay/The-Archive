import { useEffect, useMemo, useState } from 'react'
import { ALL_SPELLS } from './data/spells.js'
import { getSpellImage, levelLabel, schoolFallbackUrl } from './data/spellUtils.js'

const STORAGE_KEY = 'remarkable-tome-spellbook'
const VERBAL_COMPONENTS_STORAGE_KEY = 'remarkable-tome-verbal-components'
const SPLASH_MS = 1450
const FINDER_PAGE_SIZE = 24

const SORTS = {
  name: (a, b) => a.name.localeCompare(b.name),
  level: (a, b) => a.spellLevel - b.spellLevel || a.name.localeCompare(b.name),
  school: (a, b) => a.school.localeCompare(b.school) || a.name.localeCompare(b.name),
}

const uniq = (values) =>
  [...new Set(values.filter(Boolean))].sort((a, b) => `${a}`.localeCompare(`${b}`))

const readStoredBook = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
}

const readStoredVerbalComponents = () => {
  try {
    return JSON.parse(localStorage.getItem(VERBAL_COMPONENTS_STORAGE_KEY)) || {}
  } catch {
    return {}
  }
}

const spellId = (spell) => spell.slug || spell.name
const levelKey = (level) => `${level}`

export default function App() {
  const [loading, setLoading] = useState(true)
  const [bookIds, setBookIds] = useState(readStoredBook)
  const [verbalComponents, setVerbalComponents] = useState(readStoredVerbalComponents)
  const [selectedId, setSelectedId] = useState(
    () => readStoredBook()[0] || ALL_SPELLS[0]?.slug || ''
  )
  const [finderOpen, setFinderOpen] = useState(false)
  const [glossaryOpen, setGlossaryOpen] = useState(false)
  const [shelfLevel, setShelfLevel] = useState(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), SPLASH_MS)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookIds))
  }, [bookIds])

  useEffect(() => {
    localStorage.setItem(
      VERBAL_COMPONENTS_STORAGE_KEY,
      JSON.stringify(verbalComponents)
    )
  }, [verbalComponents])

  const book = useMemo(
    () =>
      bookIds
        .map((id) => ALL_SPELLS.find((spell) => spellId(spell) === id))
        .filter(Boolean),
    [bookIds]
  )

  const selected =
    book.find((spell) => spellId(spell) === selectedId) ||
    book[0]

  const selectedIndex = Math.max(
    0,
    book.findIndex((spell) => spellId(spell) === spellId(selected || {}))
  )

  const updateVerbalComponent = (spell, value) => {
    const id = spellId(spell)

    setVerbalComponents((current) => {
      const next = { ...current }

      if (value.trim()) next[id] = value
      else delete next[id]

      return next
    })
  }

  const toggleSpell = (spell) => {
    const id = spellId(spell)

    setBookIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    )

    setSelectedId(id)
  }

  const openSpell = (spell) => {
    setSelectedId(spellId(spell))
    setShelfLevel(null)
    setGlossaryOpen(false)
  }

  const openShelf = (level = 'all') => {
    setShelfLevel(level)
    setGlossaryOpen(false)
  }

  const movePage = (direction) => {
    if (!book.length) {
      setFinderOpen(true)
      return
    }

    const next = (selectedIndex + direction + book.length) % book.length
    setSelectedId(spellId(book[next]))
    setShelfLevel(null)
  }

  if (loading) return <SplashScreen />

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <button
            className="menu-button"
            onClick={() => setGlossaryOpen(true)}
            aria-label="Open spellbook glossary"
            aria-expanded={glossaryOpen}
          >
            <span />
            <span />
            <span />
          </button>

          <div className="brand">
            <img src="/assets/ui/owltome.png" alt="Illustrated owl mage" />

            <div>
              <p className="eyebrow">Arcane Reference Library</p>
              <h1>The Remarkable Tome</h1>
            </div>
          </div>
        </div>

        <nav className="toolbar" aria-label="Tome controls">
          <button
            className="button primary"
            onClick={() => setFinderOpen(true)}
          >
            Explore Spells
          </button>
        </nav>
      </header>

      {shelfLevel !== null ? (
        <SpellbookShelf
          spells={book}
          level={shelfLevel}
          onOpenSpell={openSpell}
          onBack={() => setShelfLevel(null)}
          onFind={() => setFinderOpen(true)}
        />
      ) : (
        <section className="reading-area">
          <button
            className="page-arrow left"
            onClick={() => movePage(-1)}
            aria-label="Previous spell"
          >
            ‹
          </button>

          {selected ? (
            <article className="open-book">
              <SpellPage
                spell={selected}
                isFavorite={bookIds.includes(spellId(selected))}
                verbalComponent={verbalComponents[spellId(selected)] || ''}
                onVerbalComponentChange={(value) =>
                  updateVerbalComponent(selected, value)
                }
                onToggle={() => toggleSpell(selected)}
              />

              <ArtPage spell={selected} />
            </article>
          ) : (
            <EmptyBook onFind={() => setFinderOpen(true)} />
          )}

          <button
            className="page-arrow right"
            onClick={() => movePage(1)}
            aria-label="Next spell"
          >
            ›
          </button>
        </section>
      )}

      {glossaryOpen && (
        <GlossaryDrawer
          spells={book}
          onClose={() => setGlossaryOpen(false)}
          onOpenSpell={openSpell}
          onViewAll={openShelf}
          onFind={() => {
            setGlossaryOpen(false)
            setFinderOpen(true)
          }}
        />
      )}

      {finderOpen && (
        <SpellFinder
          savedIds={bookIds}
          onToggle={toggleSpell}
          onClose={() => setFinderOpen(false)}
        />
      )}
    </main>
  )
}

function SplashScreen() {
  return (
    <main className="loading-splash" aria-label="Loading The Remarkable Tome">
      <img src="/assets/ui/owl-tome.png" alt="" />
    </main>
  )
}

function SpellPage({
  spell,
  isFavorite,
  verbalComponent,
  onVerbalComponentChange,
  onToggle,
}) {
  const components = [
    spell.components?.verbal && 'V',
    spell.components?.somatic && 'S',
    spell.components?.material &&
      `M${spell.components.materialText ? ` (${spell.components.materialText})` : ''}`,
  ]
    .filter(Boolean)
    .join(', ') || '—'

  return (
    <section className="paper-page spell-page">
      <div className="page-inner">
        <div className="spell-heading">
          <div>
            <p className="eyebrow">
              {levelLabel(spell.spellLevel)} {spell.school}
            </p>

            <h2>{spell.name}</h2>
          </div>

          <button
            className={`favorite ${isFavorite ? 'saved' : ''}`}
            onClick={onToggle}
            aria-label={isFavorite ? 'Remove from spellbook' : 'Add to spellbook'}
          >
            {isFavorite ? '★' : '☆'}
          </button>
        </div>

        <MobileSpellArt spell={spell} />

        <div className="rule" />

        <dl className="spell-facts">
          <Fact label="Casting Time" value={spell.castingTime} />
          <Fact label="Range" value={spell.range} />
          {spell.area && <Fact label="Area" value={spell.area} />}
          <Fact label="Components" value={components} />
          {spell.components?.verbal && (
            <VerbalComponentEditor
              value={verbalComponent}
              onChange={onVerbalComponentChange}
            />
          )}
          <Fact
            label="Duration"
            value={`${spell.concentration ? 'Concentration, ' : ''}${spell.duration}`}
          />
          {spell.classes?.length > 0 && (
            <Fact label="Classes" value={spell.classes.join(', ')} />
          )}
        </dl>

        <div className="rule thin" />
        <RichText text={spell.descriptionMd} />

        {spell.statblockHtml && <StatBlock html={spell.statblockHtml} />}

        {spell.scalingMd && (
          <div className="scaling">
            <RichText text={spell.scalingMd} />
          </div>
        )}

        <div className="tag-row">
          {[...(spell.tags || []), ...(spell.damageTypes || [])].map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

function ArtPage({ spell }) {
  return (
    <section className="paper-page art-page">
      <div className="art-frame">
        <SpellImage spell={spell} />

        <div className="art-caption">
          <strong>{spell.name}</strong>
          <span>{spell.school}</span>
        </div>
      </div>
    </section>
  )
}

function MobileSpellArt({ spell }) {
  return (
    <div className="mobile-spell-art">
      <SpellImage spell={spell} />
    </div>
  )
}

function SpellImage({ spell, className = '' }) {
  const primary = getSpellImage(spell)
  const schoolFallback = schoolFallbackUrl(spell.school)
  const genericFallback = schoolFallbackUrl('generic')
  const [src, setSrc] = useState(primary)

  useEffect(() => {
    setSrc(primary)
  }, [primary])

  return (
    <img
      className={className}
      src={src}
      onError={() => {
        if (src !== schoolFallback) setSrc(schoolFallback)
        else if (src !== genericFallback) setSrc(genericFallback)
      }}
      alt={`${spell.name} spell illustration`}
    />
  )
}

function VerbalComponentEditor({ value, onChange }) {
  return (
    <div className="verbal-component-row">
      <dt>Verbal Words</dt>
      <dd>
        <textarea
          className="verbal-component-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={2}
          placeholder="Write the incantation you want to use…"
          aria-label="Your custom verbal component"
        />
      </dd>
    </div>
  )
}

function Fact({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || '—'}</dd>
    </div>
  )
}

function RichText({ text }) {
  const paragraphs = `${text || ''}`.split(/\n\s*\n/g)

  return (
    <div className="rich-text">
      {paragraphs.map((paragraph, paragraphIndex) => (
        <p className="body-copy" key={paragraphIndex}>
          {renderInlineMarkdown(paragraph)}
        </p>
      ))}
    </div>
  )
}

function renderInlineMarkdown(text) {
  const parts = `${text || ''}`.split(/(\*\*.*?\*\*|\*.*?\*)/g)

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }

    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>
    }

    return part
  })
}

function StatBlock({ html }) {
  return (
    <section
      className="summon-statblock"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function GlossaryDrawer({ spells, onClose, onOpenSpell, onViewAll, onFind }) {
  const [expanded, setExpanded] = useState('all')
  const groups = [
    { value: 'all', label: 'All Spells' },
    ...Array.from({ length: 10 }, (_, level) => ({
      value: levelKey(level),
      label: levelLabel(level),
    })),
  ]

  const spellsFor = (value) =>
    spells
      .filter((spell) => value === 'all' || levelKey(spell.spellLevel) === value)
      .sort(SORTS.name)

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="glossary-drawer"
        aria-label="Your spellbook glossary"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="drawer-header">
          <div>
            <p className="eyebrow">Your Spellbook</p>
            <h2>Glossary</h2>
          </div>

          <button className="close" onClick={onClose} aria-label="Close glossary">
            ×
          </button>
        </header>

        <div className="drawer-groups">
          {groups.map((group) => {
            const groupSpells = spellsFor(group.value)
            const isExpanded = expanded === group.value

            return (
              <section className="drawer-group" key={group.value}>
                <button
                  className="drawer-group-toggle"
                  onClick={() => setExpanded(isExpanded ? null : group.value)}
                  aria-expanded={isExpanded}
                >
                  <span>{group.label}</span>
                  <small>{groupSpells.length}</small>
                  <b>{isExpanded ? '−' : '+'}</b>
                </button>

                {isExpanded && (
                  <div className="drawer-spells">
                    {!!groupSpells.length && (
                      <button
                        className="drawer-view-all"
                        onClick={() => onViewAll(group.value)}
                      >
                        View all {group.label.toLowerCase()}
                      </button>
                    )}

                    {groupSpells.map((spell) => (
                      <button
                        className="drawer-spell"
                        key={spellId(spell)}
                        onClick={() => onOpenSpell(spell)}
                      >
                        <span>{spell.name}</span>
                        <small>{spell.school}</small>
                      </button>
                    ))}

                    {!groupSpells.length && (
                      <p className="drawer-empty">No saved spells at this level.</p>
                    )}
                  </div>
                )}
              </section>
            )
          })}
        </div>

        <button className="button primary drawer-find" onClick={onFind}>
          Explore More Spells
        </button>
      </aside>
    </div>
  )
}

function SpellbookShelf({ spells, level, onOpenSpell, onBack, onFind }) {
  const shown = spells
    .filter((spell) => level === 'all' || levelKey(spell.spellLevel) === level)
    .sort(SORTS.name)

  return (
    <section className="shelf-shell">
      <header className="shelf-header">
        <div>
          <p className="eyebrow">Your Spellbook</p>
          <h2>{level === 'all' ? 'All Saved Spells' : levelLabel(Number(level))}</h2>
        </div>

        <button className="button" onClick={onBack}>
          Return to Tome
        </button>
      </header>

      {shown.length ? (
        <div className="shelf-grid">
          {shown.map((spell) => (
            <ScrollSpellCard
              spell={spell}
              key={spellId(spell)}
              saved
              actionKind="open"
              actionLabel="Open Spell"
              onAction={() => onOpenSpell(spell)}
            />
          ))}
        </div>
      ) : (
        <EmptyBook onFind={onFind} />
      )}
    </section>
  )
}

function SpellFinder({ savedIds, onToggle, onClose }) {
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState('all')
  const [school, setSchool] = useState('all')
  const [className, setClassName] = useState('all')
  const [castingTime, setCastingTime] = useState('all')
  const [sort, setSort] = useState('level')
  const [page, setPage] = useState(1)

  const schools = uniq(ALL_SPELLS.map((spell) => spell.school))
  const classes = uniq(ALL_SPELLS.flatMap((spell) => spell.classes || []))
  const castingTimes = uniq(ALL_SPELLS.map((spell) => spell.castingTime))

  const filtered = ALL_SPELLS
    .filter((spell) => {
      const searchable =
        `${spell.name} ${spell.school} ${spell.classes?.join(' ')} ${spell.tags?.join(' ')}`.toLowerCase()

      return (
        searchable.includes(query.toLowerCase()) &&
        (level === 'all' || `${spell.spellLevel}` === level) &&
        (school === 'all' || spell.school === school) &&
        (className === 'all' || spell.classes?.includes(className)) &&
        (castingTime === 'all' || spell.castingTime === castingTime)
      )
    })
    .sort(SORTS[sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / FINDER_PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const shown = filtered.slice(
    (currentPage - 1) * FINDER_PAGE_SIZE,
    currentPage * FINDER_PAGE_SIZE
  )

  useEffect(() => {
    setPage(1)
  }, [query, level, school, className, castingTime, sort])

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="finder"
        role="dialog"
        aria-modal="true"
        aria-label="Explore spells"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p className="eyebrow">The Index</p>
            <h2>Explore Spells</h2>
          </div>

          <button className="close" onClick={onClose} aria-label="Close spell explorer">
            ×
          </button>
        </header>

        <div className="finder-controls">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search names, tags, schools, or classes…"
          />

          <select value={level} onChange={(event) => setLevel(event.target.value)}>
            <option value="all">Every level</option>
            {Array.from({ length: 10 }, (_, i) => (
              <option value={i} key={i}>{levelLabel(i)}</option>
            ))}
          </select>

          <select value={school} onChange={(event) => setSchool(event.target.value)}>
            <option value="all">Every school</option>
            {schools.map((value) => <option key={value}>{value}</option>)}
          </select>

          <select value={className} onChange={(event) => setClassName(event.target.value)}>
            <option value="all">Every spell list</option>
            {classes.map((value) => <option key={value}>{value}</option>)}
          </select>

          <select value={castingTime} onChange={(event) => setCastingTime(event.target.value)}>
            <option value="all">Every casting time</option>
            {castingTimes.map((value) => <option key={value}>{value}</option>)}
          </select>

          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="level">Sort: level</option>
            <option value="name">Sort: name</option>
            <option value="school">Sort: school</option>
          </select>
        </div>

        <p className="finder-count">
          {filtered.length} spell{filtered.length === 1 ? '' : 's'} · Page {currentPage} of {pageCount}
        </p>

        {filtered.length > FINDER_PAGE_SIZE && (
          <div className="finder-pagination-top">
            <Pagination page={currentPage} pageCount={pageCount} onPage={setPage} />
          </div>
        )}

        <div className="finder-results">
          {shown.map((spell) => {
            const saved = savedIds.includes(spellId(spell))

            return (
              <ScrollSpellCard
                spell={spell}
                key={spellId(spell)}
                saved={saved}
                actionKind={saved ? 'release' : 'bind'}
                actionLabel={saved ? 'Release from Tome' : 'Bind to Tome'}
                onAction={() => onToggle(spell)}
              />
            )
          })}

          {!filtered.length && (
            <p className="empty-message">No spells match the current filters.</p>
          )}
        </div>

        {filtered.length > FINDER_PAGE_SIZE && (
          <Pagination page={currentPage} pageCount={pageCount} onPage={setPage} />
        )}
      </section>
    </div>
  )
}

function ScrollSpellCard({ spell, saved, actionKind = 'bind', actionLabel, onAction }) {
  return (
    <article className={`scroll-card ${saved ? 'saved' : ''}`}>
      <div className="scroll-card-image">
        <SpellImage spell={spell} />
      </div>

      <div className="scroll-card-copy">
        <p className="eyebrow">{levelLabel(spell.spellLevel)}</p>
        <h3>{spell.name}</h3>
        <p className="scroll-card-school">{spell.school}</p>
      </div>

      <button
        className={`scroll-card-action ${actionKind}`}
        onClick={onAction}
      >
        <span aria-hidden="true">
          {actionKind === 'open' ? '⌁' : actionKind === 'release' ? '✦' : '＋'}
        </span>
        {actionLabel}
      </button>
    </article>
  )
}

function Pagination({ page, pageCount, onPage }) {
  return (
    <nav className="pagination" aria-label="Spell explorer pages">
      <button className="button" disabled={page === 1} onClick={() => onPage(page - 1)}>
        Previous
      </button>

      <span>{page} / {pageCount}</span>

      <button className="button" disabled={page === pageCount} onClick={() => onPage(page + 1)}>
        Next
      </button>
    </nav>
  )
}

function EmptyBook({ onFind }) {
  return (
    <section className="empty-book">
      <img src="/assets/ui/owltome.png" alt="Owl familiar with a magical tome" />

      <div>
        <p className="eyebrow">Your pages await</p>
        <h2>The tome is empty.</h2>
        <p>Explore the index and bind spells into your personal spellbook.</p>

        <button className="button primary" onClick={onFind}>
          Explore Spells
        </button>
      </div>
    </section>
  )
}
