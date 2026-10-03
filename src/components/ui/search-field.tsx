import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface SearchFieldProps {
  placeholder: string;
  value: string;
  /** Receives the raw string, not the event. */
  onChange: (value: string) => void;
  /** True while a debounced refetch is in flight - swaps the icon for a spinner. */
  pending?: boolean;
  /** Merged over the default `pl-10 w-80`; later classes win. */
  className?: string;
  /** Merged over the wrapper's `relative`, for fields whose width comes from it. */
  wrapperClassName?: string;
  id?: string;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
}

/**
 * The search box used on every list page and in the header.
 *
 * This existed as a byte-identical nine-line block on thirteen pages, differing
 * only in the placeholder. It is one component now so the spinner lands in the
 * same place everywhere rather than thirteen times.
 *
 * The icon and the spinner share one fixed 16px slot, so swapping between them
 * cannot move the input's text or resize the field - the point of a loading
 * indicator is to be calmer than the thing it reports on.
 */
export function SearchField({
  placeholder,
  value,
  onChange,
  pending = false,
  className,
  wrapperClassName,
  id,
  onFocus,
}: SearchFieldProps) {
  return (
    <div className={cn("relative", wrapperClassName)}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center text-muted-foreground">
        {pending ? <Spinner size={16} label="Searching" /> : <Search className="w-4 h-4" />}
      </span>
      <Input
        id={id}
        placeholder={placeholder}
        className={cn("pl-10 w-80", className)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
      />
    </div>
  );
}

export default SearchField;
