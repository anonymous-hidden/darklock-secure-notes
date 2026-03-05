/**
 * Darklock Secure Notes — Search Screen
 *
 * Dedicated search with filters, saved searches, and result previews.
 * All search runs client-side on decrypted content — no server indexing.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useAppStore, DecryptedNote, SavedSearch } from '../stores/appStore';
import { Button, Input, Badge, Modal } from '@darklock/ui';
import { TopBar } from '../components/TopBar';

/* ── SVG Icons ────────────────────────────────────────────────── */
const SearchLens = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
    <defs>
      <linearGradient id="sl-g" x1="8" y1="8" x2="40" y2="40">
        <stop stopColor="#818cf8" />
        <stop offset="1" stopColor="#4f46e5" />
      </linearGradient>
    </defs>
    <circle cx="21" cy="21" r="13" stroke="url(#sl-g)" strokeWidth="2" />
    <path d="M30.5 30.5L40 40" stroke="url(#sl-g)" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const FilterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M1.5 3h11M3.5 7h7M5.5 11h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const StarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M6 1l1.5 3.1 3.4.5-2.5 2.4.6 3.4L6 8.9 3 10.4l.6-3.4L1.1 4.6l3.4-.5z" stroke="currentColor" strokeWidth="1" fill="none" />
  </svg>
);

const StarFilled = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M6 1l1.5 3.1 3.4.5-2.5 2.4.6 3.4L6 8.9 3 10.4l.6-3.4L1.1 4.6l3.4-.5z" stroke="var(--dl-warning)" strokeWidth="1" fill="var(--dl-warning)" />
  </svg>
);

const XIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const PinIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M6.5 1L9 3.5 6 6.5l-.5 2.5L3 6.5.5 4 3.5 1z" stroke="var(--dl-accent)" strokeWidth="0.8" fill="var(--dl-accent)" opacity="0.7" />
  </svg>
);

/* ── Component ─────────────────────────────────────────────────── */
export const Search: React.FC = () => {
  const notes = useAppStore((s) => s.notes);
  const sections = useAppStore((s) => s.sections);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const savedSearches = useAppStore((s) => s.savedSearches);
  const addSavedSearch = useAppStore((s) => s.addSavedSearch);
  const removeSavedSearch = useAppStore((s) => s.removeSavedSearch);
  const setActiveNote = useAppStore((s) => s.setActiveNote);
  const setActiveSection = useAppStore((s) => s.setActiveSection);
  const setScreen = useAppStore((s) => s.setScreen);

  const [showFilters, setShowFilters] = useState(false);
  const [filterSections, setFilterSections] = useState<string[]>([]);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterPinned, setFilterPinned] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');

  /* all unique tags from notes */
  const allTags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => n.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [notes]);

  /* search results */
  const results = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return notes
      .filter((n) => {
        const matchText = n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q) || n.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchText) return false;
        if (filterSections.length > 0 && !filterSections.includes(n.sectionId)) return false;
        if (filterTags.length > 0 && !filterTags.some((t) => n.tags.includes(t))) return false;
        if (filterPinned && !n.pinned) return false;
        return true;
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [notes, searchQuery, filterSections, filterTags, filterPinned]);

  /* open a result */
  const openResult = (note: DecryptedNote) => {
    setActiveSection(note.sectionId);
    setActiveNote(note.id);
    setScreen('workspace');
  };

  /* save search */
  const handleSaveSearch = () => {
    if (!saveLabel.trim() || !searchQuery.trim()) return;
    addSavedSearch({
      id: crypto.randomUUID(),
      label: saveLabel.trim(),
      query: searchQuery,
      filters: { sectionIds: filterSections, tags: filterTags, dateRange: {}, pinned: filterPinned || undefined },
      createdAt: new Date().toISOString(),
    });
    setSaveLabel('');
    setShowSaveModal(false);
  };

  /* apply saved search */
  const applySavedSearch = (s: SavedSearch) => {
    setSearchQuery(s.query);
    setFilterSections(s.filters.sectionIds);
    setFilterTags(s.filters.tags);
    setFilterPinned(!!s.filters.pinned);
  };

  /* helper: highlight match */
  const highlight = (text: string, query: string) => {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: 'var(--dl-accent-muted)', color: 'var(--dl-accent-text)', borderRadius: '2px', padding: '0 1px' }}>
          {text.slice(idx, idx + query.length)}
        </mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  const sectionName = (id: string) => sections.find((s) => s.id === id)?.name || 'Unknown';

  const relDate = (iso: string) => {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 86_400_000) return 'Today';
    if (diff < 172_800_000) return 'Yesterday';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const activeFilterCount = (filterSections.length > 0 ? 1 : 0) + (filterTags.length > 0 ? 1 : 0) + (filterPinned ? 1 : 0);

  return (
    <div className="search-screen">
      <TopBar />
      <div className="search-body">
        {/* Header */}
        <div className="search-header">
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 600 }}>Search</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--dl-text-muted)' }}>
            Client-side search &middot; your notes never leave this device
          </p>
        </div>

        {/* Search input row */}
        <div className="search-input-row">
          <div className="search-input-wrap">
            <svg className="search-input-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              className="search-input"
              placeholder="Search notes, tags, content…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button className="search-input-clear" onClick={() => setSearchQuery('')}>
                <XIcon />
              </button>
            )}
          </div>
          <button
            className={`search-filter-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <FilterIcon />
            Filters
            {activeFilterCount > 0 && <span className="search-filter-count">{activeFilterCount}</span>}
          </button>
          {searchQuery.trim() && (
            <button className="search-save-btn" onClick={() => setShowSaveModal(true)} title="Save this search">
              <StarIcon /> Save
            </button>
          )}
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="search-filters-panel" style={{ animation: 'dl-slideDown 0.2s ease' }}>
            <div className="search-filter-group">
              <label className="search-filter-label">Sections</label>
              <div className="search-filter-chips">
                {sections.map((sec) => (
                  <button
                    key={sec.id}
                    className={`search-chip ${filterSections.includes(sec.id) ? 'active' : ''}`}
                    onClick={() => setFilterSections((prev) =>
                      prev.includes(sec.id) ? prev.filter((id) => id !== sec.id) : [...prev, sec.id]
                    )}
                  >
                    {sec.name}
                  </button>
                ))}
              </div>
            </div>
            {allTags.length > 0 && (
              <div className="search-filter-group">
                <label className="search-filter-label">Tags</label>
                <div className="search-filter-chips">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      className={`search-chip ${filterTags.includes(tag) ? 'active' : ''}`}
                      onClick={() => setFilterTags((prev) =>
                        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                      )}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="search-filter-group">
              <label className="search-filter-label">Options</label>
              <label className="search-checkbox-label">
                <input type="checkbox" checked={filterPinned} onChange={(e) => setFilterPinned(e.target.checked)} />
                Pinned notes only
              </label>
            </div>
            {activeFilterCount > 0 && (
              <button className="search-clear-filters" onClick={() => { setFilterSections([]); setFilterTags([]); setFilterPinned(false); }}>
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Saved searches */}
        {savedSearches.length > 0 && (
          <div className="search-saved">
            <h3 className="search-saved-title">Saved Searches</h3>
            <div className="search-saved-list">
              {savedSearches.map((s) => (
                <div key={s.id} className="search-saved-item">
                  <button className="search-saved-btn" onClick={() => applySavedSearch(s)}>
                    <StarFilled /> {s.label}
                  </button>
                  <button className="search-saved-remove" onClick={() => removeSavedSearch(s.id)} title="Remove">
                    <XIcon />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        <div className="search-results">
          {!searchQuery.trim() ? (
            <div className="search-empty">
              <SearchLens />
              <h3 style={{ margin: '16px 0 6px', fontSize: '16px', fontWeight: 600 }}>Search your notes</h3>
              <p style={{ fontSize: '13px', color: 'var(--dl-text-muted)', maxWidth: '320px' }}>
                Type to search across all decrypted notes, titles, tags, and content. Use <kbd style={{
                  padding: '1px 6px', borderRadius: '4px', fontSize: '11px',
                  background: 'var(--dl-bg-surface)', border: '1px solid var(--dl-border)', fontFamily: 'var(--dl-font-mono)',
                }}>Ctrl+Shift+F</kbd> from anywhere.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="search-empty">
              <p style={{ fontSize: '14px', color: 'var(--dl-text-secondary)' }}>No results for &ldquo;{searchQuery}&rdquo;</p>
              <p style={{ fontSize: '12px', color: 'var(--dl-text-muted)', marginTop: '4px' }}>Try different keywords or adjust filters.</p>
            </div>
          ) : (
            <>
              <div className="search-results-count">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </div>
              <div className="search-results-list">
                {results.map((note) => (
                  <div key={note.id} className="search-result-item" onClick={() => openResult(note)}>
                    <div className="search-result-title">
                      {note.pinned && <PinIcon />}
                      {highlight(note.title || 'Untitled', searchQuery)}
                    </div>
                    <div className="search-result-preview">
                      {highlight(note.body.slice(0, 200) || 'Empty note', searchQuery)}
                    </div>
                    <div className="search-result-meta">
                      <span className="search-result-section">{sectionName(note.sectionId)}</span>
                      <span className="search-result-date">{relDate(note.updatedAt)}</span>
                      {note.tags.length > 0 && (
                        <span className="search-result-tags">
                          {note.tags.slice(0, 3).map((t) => (
                            <span key={t} className="search-result-tag">#{t}</span>
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Save search modal */}
      {showSaveModal && (
        <Modal isOpen={true} title="Save Search" onClose={() => setShowSaveModal(false)} size="sm">
          <div className="modal-form">
            <p style={{ fontSize: '13px', color: 'var(--dl-text-muted)', margin: '0 0 16px' }}>
              Save &ldquo;{searchQuery}&rdquo; for quick access later.
            </p>
            <Input
              label="Search label"
              value={saveLabel}
              autoFocus
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSaveLabel(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleSaveSearch(); }}
              placeholder="e.g. Project todos, Meeting notes..."
            />
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setShowSaveModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleSaveSearch} disabled={!saveLabel.trim()}>Save</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
