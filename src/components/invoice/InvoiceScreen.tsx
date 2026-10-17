import { useState, type FormEventHandler, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import { Spinner } from "@/components/ui/spinner";

interface InvoiceScreenProps {
  title: string;
  /** The status pill beside the title: read-only on sales, a picker on purchases. */
  status?: ReactNode;
  /** True while the record is loading, which the spinner beside the title reports. */
  loading?: boolean;
  /** Right end of the title row, which lines up with the last field below it. */
  titleActions?: ReactNode;
  /** The invoice's own fields, under the title. */
  fields: ReactNode;
  /** The main scrolling column: the invoice items. */
  children: ReactNode;
  /**
   * A narrower scrolling column beside the items, between them and the
   * summary - the extra charges. Without it the items take the full width.
   */
  side?: ReactNode;
  /** The column on the right: the summary card and the actions. */
  rail: ReactNode;
  onSubmit: FormEventHandler<HTMLFormElement>;
  /** Rendered outside the <form>, so a dialog's own buttons can never submit it. */
  dialogs?: ReactNode;
}

/**
 * The layout every invoice create and update screen shares.
 *
 *   breadcrumb
 *   title · status            actions │ ┌ Summary ┐
 *   field · field · field · field     │ │         │
 *   ──────────────────────────────────│ │         │
 *   items (60%)      │ charges (40%)  │ │  Total  │
 *   (scrolls)         │ (scrolls)     │ └─────────┘
 *                                     │ fields, buttons
 *
 * The page itself never scrolls, and neither does the summary column: only the
 * items and the charges move, each on its own, so the total and the save
 * button are always on screen however long the invoice gets. That is why the
 * right-hand container is h-screen (the CreateProduct pattern) and every flex
 * parent of a scrolling column carries min-h-0 - without it a flex child grows
 * to its content and nothing scrolls at all.
 *
 * The summary column takes a share of the screen width, between 18rem and
 * 24rem, and on shorter screens its card tightens (see InvoiceSummaryCard) so
 * it fits rather than scrolling. Only a screen too short for even that lets
 * the page itself scroll, so no button is ever out of reach.
 *
 * Every scrolling column keeps 4px of padding on its sides. A scrolling box
 * clips sideways as well as vertically, and a focused field draws its ring
 * 4px outside itself (ring-2 plus ring-offset-2); a negative margin of the
 * same size keeps the content where it was.
 *
 * One shell for the four screens rather than four copies of it, which is how
 * the sales and purchase screens drifted apart in the first place.
 */
export function InvoiceScreen({
  title,
  status,
  loading = false,
  titleActions,
  fields,
  children,
  side,
  rail,
  onSubmit,
  dialogs,
}: InvoiceScreenProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onCollapseChange={setSidebarCollapsed} />
      <div className={`${sidebarCollapsed ? "ml-16" : "ml-64"} transition-all duration-300 flex flex-col h-screen`}>
        <Header />

        <form onSubmit={onSubmit} className="flex-1 min-h-0 flex flex-col">
          <div className="shrink-0 px-6 pt-6">
            <DynamicBreadCrumb />
          </div>

          <div className="flex-1 min-h-0 flex gap-6 px-6 pt-6">
            <div className="flex-1 min-w-0 min-h-0 flex flex-col">
              <div className="shrink-0 space-y-6 pb-6 border-b border-border">
                {/* Inside the left area, so the summary beside it starts level
                    with the title, and the actions at the right end of this
                    row sit directly above the last field. */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <ArrowLeft
                      className="w-5 h-5 shrink-0 text-muted-foreground cursor-pointer hover:text-primary"
                      onClick={() => navigate(-1)}
                    />
                    <h1 className="text-2xl font-semibold leading-8 truncate">{title}</h1>
                    {status}
                    {loading && <Spinner size={18} label="Loading" color="hsl(var(--spinner))" />}
                  </div>
                  {titleActions && (
                    <div className="flex items-center gap-3 shrink-0">{titleActions}</div>
                  )}
                </div>

                {fields}
              </div>

              <div className="flex-1 min-h-0 flex">
                {/* no-scrollbar: still scrolls, without the bar. No top
                    padding here: it lives inside each section's sticky block,
                    or the rows would show through the gap above it. */}
                <div className={`${side ? "w-3/5 pr-6" : "w-full pr-1"} min-w-0 min-h-0 overflow-y-auto no-scrollbar -ml-1 pl-1 pb-6`}>
                  {children}
                </div>
                {side && (
                  <div className="w-2/5 min-w-0 min-h-0 overflow-y-auto no-scrollbar border-l border-border pl-6 -mr-1 pr-1 pb-6">
                    {side}
                  </div>
                )}
              </div>
            </div>

            <aside className="w-[26%] min-w-[18rem] max-w-[24rem] shrink-0 flex flex-col gap-3 pb-6 [@media(max-height:820px)]:gap-2">
              {rail}
            </aside>
          </div>
        </form>

        {dialogs}
      </div>
    </div>
  );
}

/**
 * A section of a scrolling column: a heading, then its content.
 *
 * With `pinned`, the heading and the pinned content (an add row and a table
 * header) stay at the top of the column while `children` - the rows - scroll
 * under them. The same sticky block the list pages use: one container for all
 * of it, so the table header needs no top offset of its own, and a background
 * so the rows disappear beneath it. Its pb-[10px] is the gap between rows.
 */
export function InvoiceSection({
  title,
  aside,
  first = false,
  pinned,
  children,
}: {
  title: string;
  aside?: ReactNode;
  first?: boolean;
  pinned?: ReactNode;
  children: ReactNode;
}) {
  // The aside (an item count, say) sits right beside the heading, not at the
  // far end of the row.
  const heading = (
    <div className="flex items-baseline gap-3">
      <h2 className="text-lg font-semibold leading-6">{title}</h2>
      {aside && <span className="text-sm text-muted-foreground">{aside}</span>}
    </div>
  );

  if (pinned !== undefined) {
    return (
      <section>
        <div className="sticky top-0 z-20 bg-background pt-6 pb-[10px] space-y-4">
          {heading}
          {pinned}
        </div>
        {children}
      </section>
    );
  }

  return (
    <section className={first ? "pt-6" : "mt-6 pt-6 border-t border-border"}>
      <div className="mb-4">{heading}</div>
      {children}
    </section>
  );
}
