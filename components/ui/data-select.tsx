"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DataSelectOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  disabled?: boolean;
}

interface DataSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: DataSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  /** Width of the closed trigger. Defaults to w-full. */
  triggerClassName?: string;
  /** Min width of the open panel. Defaults to trigger width, but can be wider. */
  panelMinWidth?: number;
  /** Width class for the open panel. Defaults to w-[320px]. */
  panelClassName?: string;
  /** When true, show a search box at the top of the open panel. */
  searchable?: boolean;
  /** When true, the trigger shows a clear button that resets the value. */
  clearable?: boolean;
  /** Error message shown below the trigger. */
  error?: string;
  /** When true, mark the field invalid. */
  invalid?: boolean;
  /** Optional id for the trigger button. */
  id?: string;
  /** Optional class names applied to the outer wrapper. */
  className?: string;
  /** Optional name attribute for form integration. */
  name?: string;
  /**
   * When true, the open panel renders inline (no portal) so it lives inside
   * the same stacking context as the trigger. Required when the DataSelect
   * sits inside a Radix Dialog/Sheet — otherwise the portal puts the panel
   * at z-index 9999 in document.body while the dialog overlay sits at
   * z-index 50 in its own portal, and the panel can be intercepted by the
   * dialog's outside-pointerdown handler.
   */
  disablePortal?: boolean;
}

/**
 * A custom dropdown built for ERP-style forms where data is long and
 * needs to be readable. Key differences from a native <select>:
 *   1. The open panel can be wider than the trigger so labels fit.
 *   2. Each option can show a description and a badge for context.
 *   3. Optional search box filters the list as the user types.
 *   4. Keyboard navigation (ArrowUp/Down/Enter/Esc) is supported.
 *
 * The panel is rendered into document.body via a portal so it can never be
 * clipped by an ancestor that has `overflow:hidden` or `overflow:auto` (e.g.
 * the `overflow-x-auto` wrapper around the items table).
 */
export const DataSelect = React.forwardRef<HTMLButtonElement, DataSelectProps>(
  function DataSelect(
    {
      value,
      onChange,
      options,
      placeholder = "Select…",
      disabled = false,
      required = false,
      triggerClassName,
      panelMinWidth,
      panelClassName = "w-[360px]",
      searchable = false,
      clearable = false,
      error,
      invalid = false,
      id,
      className,
      name,
      disablePortal = false,
    },
    ref
  ) {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const [activeIndex, setActiveIndex] = React.useState(0);
    const [panelPos, setPanelPos] = React.useState<{
      top: number;
      left: number;
      width: number;
    } | null>(null);
    const triggerRef = React.useRef<HTMLButtonElement | null>(null);
    const panelRef = React.useRef<HTMLDivElement | null>(null);
    const searchRef = React.useRef<HTMLInputElement | null>(null);
    const wrapperRef = React.useRef<HTMLDivElement | null>(null);

    const setTriggerRefs = React.useCallback(
      (node: HTMLButtonElement | null) => {
        triggerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
      },
      [ref]
    );

    const selected = React.useMemo(
      () => options.find((o) => o.value === value) || null,
      [options, value]
    );

    const filtered = React.useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) return options;
      return options.filter(
        (o) =>
          o.label.toLowerCase().includes(q) ||
          (o.description || "").toLowerCase().includes(q) ||
          (o.badge || "").toLowerCase().includes(q)
      );
    }, [options, query]);

    // Reset active index when the filter or open state changes.
    React.useEffect(() => {
      setActiveIndex(0);
    }, [query, open]);

    // Focus the search input when the panel opens.
    React.useEffect(() => {
      if (open && searchable) {
        // requestAnimationFrame keeps the focus from fighting the open transition.
        requestAnimationFrame(() => searchRef.current?.focus());
      }
      if (!open) setQuery("");
    }, [open, searchable]);

    // Compute portal position from the trigger's bounding rect, then keep
    // it in sync with scroll/resize while open. Using a portal + fixed
    // positioning lets the panel escape any overflow-clipping ancestor.
    React.useEffect(() => {
      if (!open) {
        setPanelPos(null);
        return;
      }

      const update = () => {
        const node = triggerRef.current;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        setPanelPos({
          top: rect.bottom + 4, // mt-1
          left: rect.left,
          width: rect.width,
        });
      };

      update();

      window.addEventListener("resize", update);
      window.addEventListener("scroll", update, true);
      return () => {
        window.removeEventListener("resize", update);
        window.removeEventListener("scroll", update, true);
      };
    }, [open]);

    // Close on outside click.
    React.useEffect(() => {
      if (!open) return;
      const handler = (e: MouseEvent) => {
        const target = e.target as Node;
        if (
          wrapperRef.current?.contains(target) ||
          panelRef.current?.contains(target)
        ) {
          return;
        }
        setOpen(false);
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const choose = (option: DataSelectOption) => {
      if (option.disabled) return;
      onChange(option.value);
      setOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };

    const handleListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const opt = filtered[activeIndex];
        if (opt) choose(opt);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange("");
    };

    const panelContent = (
      <div
        ref={panelRef}
        role="listbox"
        tabIndex={-1}
        onKeyDown={handleListKeyDown}
        style={{
          position: "fixed",
          top: panelPos?.top ?? 0,
          left: panelPos?.left ?? 0,
          width: panelMinWidth
            ? Math.max(panelPos?.width ?? 0, panelMinWidth)
            : panelPos?.width ?? 0,
          // disablePortal keeps the panel in the React tree of the trigger
          // (so it isn't intercepted by an ancestor Radix dialog), but it
          // still uses fixed positioning so it can escape the dialog's
          // overflow-y-auto clipping. Use z-50 to stay above the dialog
          // overlay (which is itself z-50 in its own portal).
          zIndex: disablePortal ? 60 : 9999,
        }}
        className={cn(
          "max-h-80 overflow-auto border border-gray-200 bg-white shadow-lg",
          panelClassName
        )}
      >
          {searchable && (
            <div className="sticky top-0 z-[10000] bg-white border-b border-gray-100 p-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="w-full h-8 pl-8 pr-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-gray-500">
              No matches found
            </div>
          )}

          {filtered.map((option, idx) => {
            const isSelected = option.value === value;
            const isActive = idx === activeIndex;
            return (
              <div
                key={option.value}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => choose(option)}
                className={cn(
                  "flex items-start gap-2 px-3 py-2 cursor-pointer text-sm",
                  isActive && "bg-green-50",
                  option.disabled && "opacity-50 cursor-not-allowed"
                )}
              >
               
                <span className="flex-1 min-w-0">
                  <span className="block text-gray-900 break-words">
                    {option.label}
                  </span>
                  {option.description && (
                    <span className="block text-[11px] text-gray-500 mt-0.5 break-words">
                      {option.description}
                    </span>
                  )}
                </span>
                {option.badge && (
                  <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                    {option.badge}
                  </span>
                )}
              </div>
            );
          })}
      </div>
    );

    // When disablePortal is true, render the panel inline so it shares the
    // trigger's React subtree — required when the trigger lives inside a
    // Radix Dialog/Sheet whose outside-pointerdown handler would otherwise
    // swallow the first click on a portal-rendered panel.
    // When false, render via portal so the panel escapes any overflow-clip
    // ancestor (e.g. a table wrapper).
    const panel =
      open && panelPos && typeof document !== "undefined"
        ? disablePortal
          ? panelContent
          : createPortal(panelContent, document.body)
        : null;

    return (
      <div ref={wrapperRef} className={cn("relative", className)}>
        <button
          ref={setTriggerRefs}
          type="button"
          id={id}
          name={name}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-required={required || undefined}
          aria-invalid={invalid || undefined}
          onClick={() => !disabled && setOpen((o) => !o)}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 border bg-white px-3 py-2 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500",
            "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50",
            invalid || error
              ? "border-red-400 focus:ring-red-400"
              : "border-gray-200",
            triggerClassName
          )}
        >
          <span
            className={cn(
              "truncate text-left flex-1 min-w-0",
              !selected && "text-gray-400"
            )}
          >
            {selected ? (
              <span className="min-w-0">
                <span className="block text-gray-900 truncate">{selected.label}</span>
                {selected.description && (
                  <span className="block text-[11px] text-gray-500 mt-0.5 truncate">
                    {selected.description}
                  </span>
                )}
              </span>
            ) : (
              placeholder
            )}
          </span>
          <span className="flex items-center gap-1 shrink-0">
            {clearable && selected && !disabled && (
              <span
                role="button"
                aria-label="Clear selection"
                onClick={handleClear}
                className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronDown
              className={cn(
                "h-4 w-4 text-gray-400 transition-transform",
                open && "rotate-180"
              )}
            />
          </span>
        </button>

        {error && (
          <p className="mt-1 text-xs text-red-500">{error}</p>
        )}

        {panel}
      </div>
    );
  }
);
