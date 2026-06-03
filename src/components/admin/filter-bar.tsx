import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type StatusFilter = "all" | "open" | "closed";

const TABS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "open", label: "Abiertas" },
  { value: "closed", label: "Cerradas" },
];

export function FilterBar({
  name,
  onNameChange,
  status,
  onStatusChange,
}: {
  name: string;
  onNameChange: (value: string) => void;
  status: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative max-w-xs flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar por nombre de cambiador"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          className="pl-8"
          aria-label="Buscar por nombre de cambiador"
        />
      </div>
      <Tabs value={status} onValueChange={(value) => onStatusChange(value as StatusFilter)}>
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
