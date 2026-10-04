import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, Edit, Lock, Trash2 } from "lucide-react";
import {
  TargetStatusMap,
  formatTargetValue,
  getTargetStatusColor,
} from "../../../services/utils";

/**
 * One card, for either a target or a manual data point.
 *
 * Both kinds share the shape deliberately: the pill is what tells them apart,
 * a status on a target and a grey "Data point" on a hand-typed figure. A data
 * point also has no bar and no way to edit it, which the panel says out loud so
 * the missing button reads as a rule rather than an omission.
 *
 * Every figure on a target comes from the server, computed on read. Nothing here
 * calculates anything.
 */
const TargetProgressCard = ({
  item,
  isOpen = false,
  onToggle,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}) => {
  // Local to the card: one delete button each, so a flag in Targets would
  // spin every card at once.
  const [deleting, setDeleting] = useState(false);

  if (!item) return null;

  const isTarget = item.kind !== "point";

  // The pill palettes are the four the app already ships; a data point borrows
  // the neutral one rather than introducing a fifth.
  const pillClass = isTarget
    ? getTargetStatusColor(item.status)
    : "bg-gray-100 text-gray-700";
  const pillText = isTarget
    ? TargetStatusMap[item.status] || item.status
    : "Data point";

  // Progress translates by -(100 - value)%, so a target at 140% would translate
  // positively and spill out of its track. The bar clamps; the true figure stays
  // in the text beside it.
  const barValue = Math.min(Math.max(item.percentage_achieved || 0, 0), 100);

  const toggle = () => onToggle && onToggle(item);

  /**
   * The whole card toggles. Delete and Edit live inside it, so a click that came
   * from either must not also expand or collapse — hence the button guard rather
   * than stopPropagation on each one.
   *
   * The chevron is a real button so the same action is reachable by keyboard;
   * this handler is the mouse convenience on top of it, not the only route in.
   */
  const handleCardClick = (event) => {
    if (event.target.closest("button")) return;
    toggle();
  };

  return (
    <div
      onClick={handleCardClick}
      className={`bg-card rounded-lg border overflow-hidden h-full flex flex-col cursor-pointer ${isOpen ? "row-span-2" : ""}`}
    >
      <div className="flex items-start gap-1.5 pt-3.5 pr-3 pl-4">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm font-semibold truncate">{item.name}</span>
          <span
            className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${pillClass}`}
          >
            {pillText}
          </span>
          <Button
            variant="unstyled"
            onClick={toggle}
            aria-expanded={isOpen}
            aria-label={isOpen ? "Collapse card" : "Expand card"}
            className="shrink-0 w-5 h-5 p-0 flex items-center justify-center"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 text-muted-foreground ${isOpen ? "rotate-180" : ""}`}
            />
          </Button>
        </div>

        <Button
          variant="unstyled"
          aria-label={isTarget ? "Delete target" : "Delete data point"}
          disabled={deleting || !canDelete}
          onClick={async () => {
            if (!onDelete) return;
            setDeleting(true);
            try {
              await onDelete(item);
            } finally {
              // The card usually unmounts on success, so this often lands on a
              // gone component. Harmless, and it is what releases the button
              // when the delete fails instead.
              setDeleting(false);
            }
          }}
          className="shrink-0 w-7 h-7 p-0 flex items-center justify-center rounded-md"
        >
          {deleting ? (
            <Spinner size={16} />
          ) : canDelete ? (
            <Trash2 className="w-4 h-4 text-red-700" />
          ) : (
            <Lock className="w-4 h-4 text-muted-foreground" />
          )}
        </Button>
      </div>

      {isTarget ? (
        <div className="flex-1 min-h-0 flex flex-col pt-1.5 px-4 pb-4">
          <p className="text-xs text-muted-foreground mb-4 truncate">
            {item.data_point_label} · {item.scope_label} · {item.period_label}
          </p>

          <Progress value={barValue} className="h-2" />

          <div className="flex items-baseline justify-between gap-2 mt-3.5">
            <span className="text-sm text-muted-foreground">
              {formatTargetValue(item.actual, item.unit)}{" "}
              <span className="text-muted-foreground/70">of</span>{" "}
              {formatTargetValue(item.target_value, item.unit)}
            </span>
            <span className="text-[15px] font-bold">
              {item.percentage_achieved}%
            </span>
          </div>

          {isOpen && (
            <>
              <div className="mt-3.5 pt-3.5 border-t flex flex-col gap-1">
                <div className="flex justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Remaining</span>
                  <span>{formatTargetValue(item.gap_remaining, item.unit)}</span>
                </div>
                <div className="flex justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {item.is_open ? "Days left" : "Period"}
                  </span>
                  <span>{item.is_open ? item.remaining_days : "Closed"}</span>
                </div>

                {item.filters && item.filters.length > 0 && (
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">
                    Only {item.filters.map((f) => f.label).join(", ")}
                  </p>
                )}

                {/* Wraps to two lines and clamps there. A longer outcome is cut
                    rather than pushing the card past the two rows it spans. */}
                {item.outcome && (
                  <p className="mt-0.5 text-sm leading-snug line-clamp-2">
                    {item.outcome}
                  </p>
                )}

                {/* Which date the figure counts on, and how returns are treated.
                    Not decoration: sales revenue counts invoiced value on the
                    invoice date while cash received counts cleared money on the
                    day it moved, so without this a correct number looks wrong. */}
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground line-clamp-2">
                  {item.date_basis_label}
                  {item.returns_treatment ? ` · ${item.returns_treatment}` : ""}
                </p>
              </div>

              {/* mt-auto pins it to the foot of the card, so it lands in the same
                  place whether the panel above it is full or nearly empty. */}
              <Button
                variant="outline"
                disabled={!canEdit}
                onClick={() => onEdit && onEdit(item)}
                className="w-full h-8 mt-auto flex items-center justify-center gap-2"
              >
                {canEdit ? (
                  <Edit className="w-3.5 h-3.5" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
                <span>Edit this target</span>
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col pt-2.5 px-4 pb-4">
          <div className="text-[22px] font-bold tracking-tight">
            {formatTargetValue(item.value, item.value_type)}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {item.as_of_date
              ? `Accurate as of ${item.as_of_date}`
              : "No date recorded"}
          </p>

          {isOpen && (
            <div className="mt-3.5 pt-3.5 border-t flex flex-col gap-1">
              <div className="flex justify-between gap-2 text-sm">
                <span className="text-muted-foreground">Recorded</span>
                <span>{item.created_at_label}</span>
              </div>
              {item.notes && (
                <p className="mt-0.5 text-sm leading-snug line-clamp-3">
                  {item.notes}
                </p>
              )}
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                Typed in by hand and never measured. It cannot be changed:
                delete it and record a new one.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TargetProgressCard;
