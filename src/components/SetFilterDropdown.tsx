import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

interface SetFilterDropdownProps {
  value: string;
  onChange: (value: string) => void;
  setMap: Record<string, string>;
  setColours: Record<string, string>;
}

/**
 * Custom dropdown replacing the native <select> for set filtering.
 * Matches the search bar's surface treatment (border-radius, bloom focus).
 * Full ARIA combobox pattern with keyboard navigation.
 */
export const SetFilterDropdown: React.FC<SetFilterDropdownProps> = ({
  value,
  onChange,
  setMap,
  setColours,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = 'set-filter-listbox';

  // Build options array: "All Sets" first, then set entries
  const options = useMemo(() => {
    const items: { code: string; label: string }[] = [
      { code: 'all', label: 'All Sets' },
    ];
    Object.keys(setMap).forEach((code) => {
      items.push({ code, label: setMap[code] ?? code });
    });
    return items;
  }, [setMap]);

  const selectedLabel = value === 'all' ? 'All Sets' : (setMap[value] || value);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (ev: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(ev.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (!isOpen || highlightedIdx < 0) return;
    const listEl = listRef.current;
    if (!listEl) return;
    const optionEl = listEl.children[highlightedIdx] as HTMLElement | undefined;
    if (optionEl) {
      optionEl.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIdx, isOpen]);

  // When opening, set highlighted to current selection
  useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex((o) => o.code === value);
      setHighlightedIdx(idx >= 0 ? idx : 0);
    }
  }, [isOpen, value, options]);

  const selectOption = useCallback(
    (code: string) => {
      onChange(code);
      setIsOpen(false);
      // Return focus to trigger
      requestAnimationFrame(() => triggerRef.current?.focus());
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (ev: React.KeyboardEvent) => {
      if (!isOpen) {
        // Open on arrow down, Enter, or Space
        if (ev.key === 'ArrowDown' || ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (ev.key) {
        case 'ArrowDown':
          ev.preventDefault();
          setHighlightedIdx((prev) => Math.min(prev + 1, options.length - 1));
          break;
        case 'ArrowUp':
          ev.preventDefault();
          setHighlightedIdx((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
        case ' ':
          ev.preventDefault();
          {
            const opt = options[highlightedIdx];
            if (highlightedIdx >= 0 && opt) {
              selectOption(opt.code);
            }
          }
          break;
        case 'Escape':
          ev.preventDefault();
          setIsOpen(false);
          requestAnimationFrame(() => triggerRef.current?.focus());
          break;
        case 'Home':
          ev.preventDefault();
          setHighlightedIdx(0);
          break;
        case 'End':
          ev.preventDefault();
          setHighlightedIdx(options.length - 1);
          break;
      }
    },
    [isOpen, highlightedIdx, options, selectOption],
  );

  const activeColour = value !== 'all' ? (setColours[value] || 'var(--accent)') : null;

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', marginBottom: 10 }}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger button */}
      <button
        ref={triggerRef}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-activedescendant={
          isOpen && highlightedIdx >= 0 && options[highlightedIdx]
            ? `set-option-${options[highlightedIdx].code}`
            : undefined
        }
        className="set-filter-trigger"
        style={{
          width: '100%',
          padding: '10px 40px 10px 14px',
          background: '#111827',
          border: isOpen ? '1px solid var(--accent)' : '1px solid #1A2540',
          borderRadius: isOpen ? 'var(--radius-md) var(--radius-md) 0 0' : 'var(--radius-md)',
          color: 'var(--text-primary)',
          fontSize: 14,
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 400,
          cursor: 'pointer',
          transition: 'border-color 200ms ease, box-shadow 300ms ease, border-radius 150ms ease',
          textAlign: 'left',
          position: 'relative',
          boxShadow: isOpen
            ? '0 0 0 1px var(--accent), 0 0 16px rgba(245,166,35,0.12), 0 0 32px rgba(245,166,35,0.06)'
            : '0 0 0 0 transparent',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {/* Set colour dot indicator */}
        {activeColour && (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: activeColour,
              flexShrink: 0,
              boxShadow: `0 0 6px ${activeColour}40`,
            }}
          />
        )}
        <span
          style={{
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {selectedLabel}
        </span>

        {/* Chevron — rotates 180° when open */}
        <svg
          style={{
            position: 'absolute',
            right: 14,
            top: '50%',
            width: 14,
            height: 14,
            color: isOpen ? 'var(--accent)' : 'var(--text-secondary)',
            pointerEvents: 'none',
            transition: 'transform 200ms cubic-bezier(0.25, 0.1, 0.25, 1.0), color 200ms ease',
            transform: isOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%) rotate(0deg)',
          }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Set colour underline — visible when a set is selected and dropdown is closed */}
      {value !== 'all' && !isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 12,
            right: 12,
            height: 2,
            background: activeColour || 'var(--accent)',
            borderRadius: 1,
            transition: 'background 200ms ease',
          }}
        />
      )}

      {/* Dropdown panel */}
      {isOpen && (
        <div
          ref={listRef}
          role="listbox"
          id={listboxId}
          aria-label="Filter by set"
          className="set-filter-panel"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#111827',
            border: '1px solid var(--accent)',
            borderTop: 'none',
            borderRadius: '0 0 var(--radius-md) var(--radius-md)',
            maxHeight: 320,
            overflowY: 'auto',
            zIndex: 200,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4), 0 0 1px rgba(0,0,0,0.2)',
            animation: 'slideInDown 150ms cubic-bezier(0.25, 0.1, 0.25, 1.0)',
          }}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.code === value;
            const isHighlighted = idx === highlightedIdx;
            const optColour = opt.code !== 'all' ? (setColours[opt.code] || null) : null;

            return (
              <div
                key={opt.code}
                id={`set-option-${opt.code}`}
                role="option"
                aria-selected={isSelected}
                className="set-filter-option"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '0 14px',
                  height: 40,
                  minHeight: 40,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontFamily: "'Outfit', sans-serif",
                  color: isSelected ? 'var(--accent)' : '#E8EAED',
                  background: isHighlighted ? 'rgba(245, 166, 35, 0.08)' : 'transparent',
                  borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                  transition: 'background 100ms ease, color 100ms ease',
                }}
                onMouseEnter={() => setHighlightedIdx(idx)}
                onMouseDown={(ev) => {
                  // Prevent blur from trigger
                  ev.preventDefault();
                  selectOption(opt.code);
                }}
              >
                {/* Set colour dot */}
                {optColour && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: optColour,
                      flexShrink: 0,
                      opacity: isSelected ? 1 : 0.6,
                    }}
                  />
                )}
                <span
                  style={{
                    flex: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: '1.3',
                  }}
                >
                  {opt.label}
                </span>
                {/* Check mark for selected */}
                {isSelected && (
                  <svg
                    style={{ width: 14, height: 14, color: 'var(--accent)', flexShrink: 0 }}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
