"use client";

import * as React from "react";
import { Check } from "lucide-react";

import {
  EDGE_TYPES,
  NODE_TYPES,
  EDGE_LABEL,
  NODE_TYPE_LABEL,
  type EdgeType,
  type NodeType,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const NODE_SWATCH: Record<NodeType, string> = {
  question: "#2563eb",
  claim: "#b45309",
  evidence: "#15803d",
  method: "#7c3aed",
  source: "#57534e",
  evidencepattern: "#3b82a6",
  artifact: "#ce5555",
};

const EDGE_SWATCH: Record<EdgeType, string> = {
  supports: "#15803d",
  opposes: "#dc2626",
  addresses: "#2563eb",
  derivedFrom: "#a8a29e",
  usesMethod: "#7c3aed",
  informs: "#7c3aed",
  usesArtifact: "#ce5555",
};

export interface GraphFiltersState {
  nodeTypes: Set<NodeType>;
  edgeTypes: Set<EdgeType>;
  /** Empty set means "all sections" */
  sections: Set<string>;
  /** Empty set means "all statuses" */
  statuses: Set<string>;
}

export function defaultFilters(): GraphFiltersState {
  return {
    nodeTypes: new Set(NODE_TYPES),
    edgeTypes: new Set(EDGE_TYPES),
    sections: new Set(),
    statuses: new Set(),
  };
}

interface Props {
  filters: GraphFiltersState;
  onChange: (next: GraphFiltersState) => void;
  availableSections: string[];
  availableStatuses: string[];
  visibleNodeCount: number;
  totalNodeCount: number;
  visibleEdgeCount: number;
  totalEdgeCount: number;
}

export function GraphFilters({
  filters,
  onChange,
  availableSections,
  availableStatuses,
  visibleNodeCount,
  totalNodeCount,
  visibleEdgeCount,
  totalEdgeCount,
}: Props) {
  const allOn = (kind: "nodeTypes" | "edgeTypes") =>
    onChange({
      ...filters,
      [kind]: new Set(kind === "nodeTypes" ? NODE_TYPES : EDGE_TYPES),
    });
  const noneOn = (kind: "nodeTypes" | "edgeTypes") =>
    onChange({ ...filters, [kind]: new Set() });

  const toggleNode = (t: NodeType) => {
    const next = new Set(filters.nodeTypes);
    next.has(t) ? next.delete(t) : next.add(t);
    onChange({ ...filters, nodeTypes: next });
  };
  const toggleEdge = (e: EdgeType) => {
    const next = new Set(filters.edgeTypes);
    next.has(e) ? next.delete(e) : next.add(e);
    onChange({ ...filters, edgeTypes: next });
  };
  const toggleSection = (s: string) => {
    const next = new Set(filters.sections);
    next.has(s) ? next.delete(s) : next.add(s);
    onChange({ ...filters, sections: next });
  };
  const toggleStatus = (s: string) => {
    const next = new Set(filters.statuses);
    next.has(s) ? next.delete(s) : next.add(s);
    onChange({ ...filters, statuses: next });
  };

  const isDefault =
    filters.nodeTypes.size === NODE_TYPES.length &&
    filters.edgeTypes.size === EDGE_TYPES.length &&
    filters.sections.size === 0 &&
    filters.statuses.size === 0;

  return (
    <div className="space-y-5 text-xs font-sans">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-semibold uppercase tracking-wider text-muted-foreground">
          Filters
        </p>
        {!isDefault && (
          <button
            type="button"
            onClick={() => onChange(defaultFilters())}
            className="text-[10px] uppercase tracking-wider text-primary hover:underline"
          >
            Reset all
          </button>
        )}
      </div>

      <p className="rounded border border-border bg-card/50 px-2 py-1.5 text-[11px] tabular-nums text-muted-foreground">
        Showing <strong className="text-foreground">{visibleNodeCount}</strong>
        /{totalNodeCount} nodes ·{" "}
        <strong className="text-foreground">{visibleEdgeCount}</strong>
        /{totalEdgeCount} edges
      </p>

      <FilterSection
        title="Node types"
        count={filters.nodeTypes.size}
        total={NODE_TYPES.length}
        onAll={() => allOn("nodeTypes")}
        onNone={() => noneOn("nodeTypes")}
      >
        <div className="grid grid-cols-1 gap-1">
          {NODE_TYPES.map((t) => (
            <Chip
              key={t}
              active={filters.nodeTypes.has(t)}
              onClick={() => toggleNode(t)}
              swatch={
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: NODE_SWATCH[t] }}
                />
              }
              label={NODE_TYPE_LABEL[t]}
            />
          ))}
        </div>
      </FilterSection>

      <FilterSection
        title="Edge types"
        count={filters.edgeTypes.size}
        total={EDGE_TYPES.length}
        onAll={() => allOn("edgeTypes")}
        onNone={() => noneOn("edgeTypes")}
      >
        <div className="grid grid-cols-1 gap-1">
          {EDGE_TYPES.map((e) => (
            <Chip
              key={e}
              active={filters.edgeTypes.has(e)}
              onClick={() => toggleEdge(e)}
              swatch={
                <span
                  className="h-0.5 w-3"
                  style={{ backgroundColor: EDGE_SWATCH[e] }}
                />
              }
              label={EDGE_LABEL[e]}
            />
          ))}
        </div>
      </FilterSection>

      <FilterSection
        title="Sections"
        count={filters.sections.size === 0 ? availableSections.length : filters.sections.size}
        total={availableSections.length}
        emptyMeansAll
        onAll={() => onChange({ ...filters, sections: new Set() })}
        onNone={() =>
          onChange({ ...filters, sections: new Set(availableSections) })
        }
      >
        <div className="flex flex-wrap gap-1 max-h-64 overflow-y-auto pr-1">
          {availableSections.map((s) => (
            <SmallChip
              key={s}
              active={
                filters.sections.size === 0 || filters.sections.has(s)
              }
              dimmed={
                filters.sections.size > 0 && !filters.sections.has(s)
              }
              onClick={() => toggleSection(s)}
              label={s}
              monospace
            />
          ))}
        </div>
      </FilterSection>

      {availableStatuses.length > 0 && (
        <FilterSection
          title="Status"
          count={filters.statuses.size === 0 ? availableStatuses.length : filters.statuses.size}
          total={availableStatuses.length}
          emptyMeansAll
          onAll={() => onChange({ ...filters, statuses: new Set() })}
          onNone={() =>
            onChange({ ...filters, statuses: new Set(availableStatuses) })
          }
        >
          <div className="flex flex-wrap gap-1">
            {availableStatuses.map((s) => (
              <SmallChip
                key={s}
                active={
                  filters.statuses.size === 0 || filters.statuses.has(s)
                }
                dimmed={
                  filters.statuses.size > 0 && !filters.statuses.has(s)
                }
                onClick={() => toggleStatus(s)}
                label={s}
              />
            ))}
          </div>
        </FilterSection>
      )}
    </div>
  );
}

function FilterSection({
  title,
  count,
  total,
  onAll,
  onNone,
  emptyMeansAll,
  children,
}: {
  title: string;
  count: number;
  total: number;
  onAll: () => void;
  onNone: () => void;
  emptyMeansAll?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <p className="font-semibold uppercase tracking-wider text-muted-foreground">
          {title}{" "}
          <span className="font-normal normal-case tracking-normal text-muted-foreground/70">
            {count}/{total}
          </span>
        </p>
        <span className="flex gap-2 text-[10px] text-muted-foreground">
          <button
            type="button"
            onClick={onAll}
            className="hover:text-primary hover:underline"
          >
            {emptyMeansAll ? "all" : "all"}
          </button>
          <span className="text-border">|</span>
          <button
            type="button"
            onClick={onNone}
            className="hover:text-primary hover:underline"
          >
            none
          </button>
        </span>
      </div>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  swatch,
  label,
}: {
  active: boolean;
  onClick: () => void;
  swatch?: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded border px-2 py-1 text-left transition-colors",
        active
          ? "border-border bg-card text-foreground"
          : "border-transparent bg-transparent text-muted-foreground/60 hover:text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "flex h-3 w-3 shrink-0 items-center justify-center rounded-sm border",
          active
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card",
        )}
      >
        {active && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
      </span>
      {swatch}
      <span className="truncate">{label}</span>
    </button>
  );
}

function SmallChip({
  active,
  dimmed,
  onClick,
  label,
  monospace,
}: {
  active: boolean;
  dimmed?: boolean;
  onClick: () => void;
  label: string;
  monospace?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2 py-0.5 transition-colors",
        monospace ? "font-mono text-[10px]" : "text-[10px]",
        dimmed
          ? "border-transparent bg-transparent text-muted-foreground/40 hover:text-muted-foreground"
          : active
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary",
      )}
    >
      {label}
    </button>
  );
}
