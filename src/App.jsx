import { useEffect, useMemo, useState } from 'react'
import { ALL_SPELLS } from './data/spells.js'
import { getSpellImage, levelLabel, schoolFallbackUrl } from './data/spellUtils.js'

const STORAGE_KEY = 'remarkable-tome-spellbook'
const DISPLAY_KEY = 'remarkable-tome-display-mode'
const SPLASH_MS = 1450

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

const spellId = (spell) => spell.slug || spell.name

export default function App() {
  const [loading, setLoading] = useState(true)
  const [bookIds, setBookIds] = useState(readStoredBook)
  const [selectedId, setSelectedId] = useState(
    () => readStoredBook()[0] || ALL_SPELLS[0]?.slug || ''
  )
  const [finderOpen, setFinderOpen] = useState(false)
  const [displayMode, setDisplayMode] = useState(
    () => localStorage.getItem(DISPLAY_KEY) || 'tome'
  )
  const [mobilePage, setMobilePage] = useState('details')

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), SPLASH_MS)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookIds))
  }, [bookIds])

  useEffect(() => {
    localStorage.setItem(DISPLAY_KEY, displayMode)
  }, [displayMode])

  const book = useMemo(
    () =>
      bookIds
        .map((id) => ALL_SPELLS.find((spell) => spellId(spell) === id))
        .filter(Boolean),
    [bookIds]
  )

  const selected =
    ALL_SPELLS.find((spell) => spellId(spell) === selectedId) ||
    book[0] ||
    ALL_SPELLS[0]

  const selectedIndex = Math.max(
    0,
    book.findIndex((spell) => spellId(spell) === spellId(selected || {}))
  )

  const toggleSpell = (spell) => {
    const id = spellId(spell)

    setBookIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    )

    setSelectedId(id)
  }

  const movePage = (direction) => {
    if (!book.length) {
      setFinderOpen(true)
      return
    }

    const next = (selectedIndex + direction + book.length) % book.length
    setSelectedId(spellId(book[next]))
  }

  if (loading) return <SplashScreen />

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img src="/assets/ui/owltome.png" alt="Illustrated owl mage" />

          <div>
            <p className="eyebrow">Arcane Reference Library</p>
            <h1>The Remarkable Tome</h1>
          </div>
        </div>

        <nav className="toolbar" aria-label="Tome controls">
          <button
            className="button primary"
            onClick={() => setFinderOpen(true)}
          >
            Find Spells
          </button>

          <button
            className="button"
            onClick={() =>
              setDisplayMode(displayMode === 'tome' ? 'list' : 'tome')
            }
          >
            {displayMode === 'tome' ? 'Efficient List' : 'Open Tome'}
          </button>
        </nav>
      </header>

      {displayMode === 'list' ? (
        <SpellbookList
          spells={book}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onRemove={toggleSpell}
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
            <article className={`open-book show-${mobilePage}`}>
              <SpellPage
                spell={selected}
                isFavorite={bookIds.includes(spellId(selected))}
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

          {selected && (
            <div className="mobile-page-switcher">
              <button
                className={mobilePage === 'details' ? 'active' : ''}
                onClick={() => setMobilePage('details')}
              >
                Spell
              </button>

              <button
                className={mobilePage === 'art' ? 'active' : ''}
                onClick={() => setMobilePage('art')}
              >
                Illustration
              </button>
            </div>
          )}
        </section>
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
    <main
      className="loading-splash"
      aria-label="Loading The Remarkable Tome"
    >
      <img src="/assets/ui/owl-tome.png" alt="" />
    </main>
  )
}

function SpellPage({ spell, isFavorite, onToggle }) {
  const components = [
    spell.components?.verbal && 'V',
    spell.components?.somatic && 'S',
    spell.components?.material &&
      `M${spell.components.materialText ? ` (${spell.components.materialText})` : ''}`,
  ]
    .filter(Boolean)
    .join(', ') || '—'

  return (
    <section className="paper-page spell-page mobile-details">
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
            aria-label={
              isFavorite
                ? 'Remove from spellbook'
                : 'Add to spellbook'
            }
          >
            {isFavorite ? '★' : '☆'}
          </button>
        </div>

        <div className="rule" />

        <dl className="spell-facts">
          <Fact label="Casting Time" value={spell.castingTime} />
          <Fact label="Range" value={spell.range} />

          {spell.area && (
            <Fact label="Area" value={spell.area} />
          )}

          <Fact label="Components" value={components} />

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

        {spell.statblockHtml && (
          <StatBlock html={spell.statblockHtml} />
        )}

        {spell.scalingMd && (
          <div className="scaling">
            <RichText text={spell.scalingMd} />
          </div>
        )}

        <div className="tag-row">
          {[...(spell.tags || []), ...(spell.damageTypes || [])].map(
            (tag) => (
              <span key={tag}>{tag}</span>
            )
          )}
        </div>
      </div>
    </section>
  )
}

function ArtPage({ spell }) {
  const [src, setSrc] = useState(getSpellImage(spell))

  useEffect(() => {
    setSrc(getSpellImage(spell))
  }, [spell])

  return (
    <section className="paper-page art-page mobile-art">
      <div className="art-frame">
        <img
          src={src}
          onError={() => setSrc(schoolFallbackUrl(spell.school))}
          alt={`${spell.name} spell illustration`}
        />

        <div className="art-caption">
          <strong>{spell.name}</strong>
          <span>{spell.school}</span>
        </div>
      </div>
    </section>
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
      return (
        <strong key={index}>
          {part.slice(2, -2)}
        </strong>
      )
    }

    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={index}>
          {part.slice(1, -1)}
        </em>
      )
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

function SpellbookList({
  spells,
  selectedId,
  onSelect,
  onRemove,
  onFind,
}) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('level')

  const shown = spells
    .filter((spell) =>
      `${spell.name} ${spell.school} ${spell.classes?.join(' ')}`
        .toLowerCase()
        .includes(query.toLowerCase())
    )
    .sort(SORTS[sort])

  return (
    <section className="list-shell">
      <div className="list-controls">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search your spellbook…"
        />

        <select
          value={sort}
          onChange={(event) => setSort(event.target.value)}
        >
          <option value="level">Sort by level</option>
          <option value="name">Sort by name</option>
          <option value="school">Sort by school</option>
        </select>

        <button
          className="button primary"
          onClick={onFind}
        >
          Add Spells
        </button>
      </div>

      {shown.length ? (
        <div className="spell-table">
          {shown.map((spell) => (
            <div
              className={`spell-row ${
                selectedId === spellId(spell) ? 'selected' : ''
              }`}
              key={spellId(spell)}
            >
              <button
                className="spell-row-main"
                onClick={() => onSelect(spellId(spell))}
              >
                <strong>{spell.name}</strong>

                <span>
                  {levelLabel(spell.spellLevel)} · {spell.school}
                </span>

                <span>{spell.castingTime}</span>
                <span>{spell.classes?.join(', ')}</span>
              </button>

              <button
                className="remove"
                onClick={() => onRemove(spell)}
                aria-label={`Remove ${spell.name} from spellbook`}
              >
                ×
              </button>
            </div>
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

  const schools = uniq(ALL_SPELLS.map((spell) => spell.school))
  const classes = uniq(
    ALL_SPELLS.flatMap((spell) => spell.classes || [])
  )
  const castingTimes = uniq(
    ALL_SPELLS.map((spell) => spell.castingTime)
  )

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

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="finder"
        role="dialog"
        aria-modal="true"
        aria-label="Find spells"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p className="eyebrow">The Index</p>
            <h2>Find Spells</h2>
          </div>

          <button
            className="close"
            onClick={onClose}
            aria-label="Close spell finder"
          >
            ×
          </button>
        </header>

        <div className="finder-controls">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search names, tags, schools, or classes…"
          />

          <select
            value={level}
            onChange={(event) => setLevel(event.target.value)}
          >
            <option value="all">Every level</option>

            {Array.from({ length: 10 }, (_, i) => (
              <option value={i} key={i}>
                {levelLabel(i)}
              </option>
            ))}
          </select>

          <select
            value={school}
            onChange={(event) => setSchool(event.target.value)}
          >
            <option value="all">Every school</option>

            {schools.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>

          <select
            value={className}
            onChange={(event) => setClassName(event.target.value)}
          >
            <option value="all">Every spell list</option>

            {classes.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>

          <select
            value={castingTime}
            onChange={(event) => setCastingTime(event.target.value)}
          >
            <option value="all">Every casting time</option>

            {castingTimes.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="level">Sort: level</option>
            <option value="name">Sort: name</option>
            <option value="school">Sort: school</option>
          </select>
        </div>

        <div className="finder-results">
          {filtered.map((spell) => {
            const saved = savedIds.includes(spellId(spell))

            return (
              <article
                className="finder-card"
                key={spellId(spell)}
              >
                <div>
                  <p className="eyebrow">
                    {levelLabel(spell.spellLevel)} · {spell.school}
                  </p>

                  <h3>{spell.name}</h3>
                  <p>{spell.classes?.join(', ')}</p>
                </div>

                <button
                  className={`button ${
                    saved ? 'saved-button' : 'primary'
                  }`}
                  onClick={() => onToggle(spell)}
                >
                  {saved ? 'Saved ★' : 'Add ☆'}
                </button>
              </article>
            )
          })}

          {!filtered.length && (
            <p className="empty-message">
              No spells match the current filters.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

function EmptyBook({ onFind }) {
  return (
    <section className="empty-book">
      <img
        src="/assets/ui/owltome.png"
        alt="Owl familiar with a magical tome"
      />

      <div>
        <p className="eyebrow">Your pages await</p>
        <h2>The tome is empty.</h2>

        <p>
          Open the index and favorite spells to bind them into your
          personal spellbook.
        </p>

        <button
          className="button primary"
          onClick={onFind}
        >
          Find Spells
        </button>
      </div>
    </section>
  )
}