import { useState, type KeyboardEvent } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { RemoveTagButton } from "@/shared/components/buttons/Buttons";

export function TagInput({
  value,
  onChange,
  placeholder = "Type and press enter",
  id,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  id?: string;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const tag = draft.trim();
    if (!tag || value.includes(tag)) return setDraft("");
    onChange([...value, tag]);
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="rounded-lg border bg-card p-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 rounded-md py-1 pr-1 font-normal">
            {tag}
            <RemoveTagButton tag={tag} onRemove={(t) => onChange(value.filter((v) => v !== t))} />
          </Badge>
        ))}
      </div>
      <Input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={add}
        placeholder={placeholder}
        className="mt-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
      />
    </div>
  );
}
