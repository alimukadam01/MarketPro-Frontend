import { Skeleton } from "@/components/ui/skeleton";


interface FormSkeletonProps {
  /** Roughly how many fields the real form has, so the placeholder is its height. */
  fields?: number;
  /** The form's own wrapper classes, so the placeholder occupies the same box. */
  className?: string;
}

/**
 * Stands in for an Update page's form while the record is still being fetched.
 *
 * This is not only a loading indicator. Every one of these pages populates its
 * inputs with a reset() when the detail request lands, so anyone typing before
 * that had their work silently overwritten - the faster the typist, the worse
 * it was. Not rendering the inputs until the data is in removes the race rather
 * than narrowing it.
 *
 * Deliberately generic: a label bar, a field bar, repeated. It does not try to
 * mirror each form's columns, because twelve bespoke placeholders would be
 * twelve more things to keep in step with twelve forms. Callers pass their own
 * wrapper className so the box is the right size and in the right place, which
 * is what stops the page jumping when the real form replaces it.
 */
export function FormSkeleton({ fields = 4, className }: FormSkeletonProps) {
  return (
    // Two elements on purpose. The caller's classes size and place the box, and
    // most of these forms are `flex flex-row`, which would win over a flex-col on
    // the same element and lay the fields out sideways. The stack lives on a
    // child, where nothing the caller passes can reach it.
    <div className={className} aria-hidden="true">
      <div className="flex flex-1 flex-col gap-6">
        {/* the form's heading */}
        <Skeleton className="h-6 w-48" />

        {Array.from({ length: fields }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}

        {/* the submit button, which ends every one of these forms */}
        <Skeleton className="h-10 w-40 self-end" />
      </div>
    </div>
  );
}

export default FormSkeleton;
