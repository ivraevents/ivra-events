"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Category } from "@/types/domain";

export interface StallFilterState {
  size: string;
  monopoly: string;
  category: string;
  availability: string;
}

export function StallFilters({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: StallFilterState;
  onChange: (v: StallFilterState) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <Select value={value.size} onValueChange={(v) => onChange({ ...value, size: v })}>
        <SelectTrigger className="w-40"><SelectValue placeholder="Size" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sizes</SelectItem>
          <SelectItem value="half">Half</SelectItem>
          <SelectItem value="full">Full</SelectItem>
        </SelectContent>
      </Select>

      <Select value={value.monopoly} onValueChange={(v) => onChange({ ...value, monopoly: v })}>
        <SelectTrigger className="w-48"><SelectValue placeholder="Monopoly" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Monopoly &amp; Non-Monopoly</SelectItem>
          <SelectItem value="monopoly">Monopoly only</SelectItem>
          <SelectItem value="non_monopoly">Non-Monopoly only</SelectItem>
        </SelectContent>
      </Select>

      <Select value={value.category} onValueChange={(v) => onChange({ ...value, category: v })}>
        <SelectTrigger className="w-48"><SelectValue placeholder="Category" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={value.availability} onValueChange={(v) => onChange({ ...value, availability: v })}>
        <SelectTrigger className="w-44"><SelectValue placeholder="Availability" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All stalls</SelectItem>
          <SelectItem value="available">Available only</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
