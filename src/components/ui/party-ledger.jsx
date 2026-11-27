import { useState } from "react";
import DataTable from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { formatDate, listCountLabel } from "../../../services/utils";

const formatCurrency = (amount) => `PKR ${Number(amount || 0).toLocaleString()}`;
const money = (value) => (value ? formatCurrency(value) : "-");

const cols = [
    { key: "id", label: "ID" },
    { key: "date", label: "Date" },
    { key: "description", label: "Description" },
    { key: "reference", label: "Reference" },
    { key: "debit", label: "Debit", render: money },
    { key: "credit", label: "Credit", render: money },
    {
        key: "balance",
        label: "Balance",
        render: (value) => (
            <span className="font-medium">{formatCurrency(value)}</span>
        ),
    },
];

// Both sides at once (People, register #25): every row says which side it is
// on, and each side keeps its own running balance - never one netted figure.
const SIDE_LABEL = { receivable: "Receivable", payable: "Payable" };
const bothCols = [
    { key: "id", label: "ID" },
    { key: "date", label: "Date" },
    { key: "description", label: "Description" },
    { key: "reference", label: "Reference" },
    { key: "side", label: "Side", render: (value) => SIDE_LABEL[value] || "-" },
    { key: "debit", label: "Debit", render: money },
    { key: "credit", label: "Credit", render: money },
    {
        key: "receivable_balance",
        label: "Receivable",
        render: (value) => <span className="font-medium">{formatCurrency(value)}</span>,
    },
    {
        key: "payable_balance",
        label: "Payable",
        render: (value) => <span className="font-medium">{formatCurrency(value)}</span>,
    },
];

// The Type filter: which khaata descriptions each choice keeps. Several can
// be ticked at once; none ticked means all types.
const TYPE_GROUPS = {
    invoices: { label: "Invoices", match: ["Sales invoice", "Purchase invoice"] },
    payments: {
        label: "Payments",
        match: ["Payment received", "Payment made", "On-account payment", "Refund"],
    },
    set_offs: { label: "Set-offs", match: ["Set-off"] },
    loans: { label: "Loans", match: ["Loan given", "Loan recovered", "Loan received", "Loan repaid"] },
    notes: { label: "Notes", match: ["Credit note", "Debit note"] },
    opening: { label: "Opening balance", match: ["Opening balance"] },
};

/**
 * One party's khaata. Owns the date range inputs and hands the chosen range
 * back to the page, which does the fetching.
 *
 * title names the party kind, so the customer and supplier screens can share
 * this component and still read "Customer Ledger" / "Supplier Ledger".
 *
 * For the person page: `titleExtra` sits beside the heading (the side switch),
 * `typeFilter` adds the Type select, and `sides` switches to the both-sides
 * layout, which the ledger then carries per side.
 */
const PartyLedgerSection = ({
    ledger,
    onRangeApply,
    actions = null,
    title = "Ledger",
    titleExtra = null,
    typeFilter = false,
    sides = false,
    // True on the first load and on every date-range Apply. The heading, the
    // date inputs and the actions stay live while it is set - the filter is
    // the control the user just operated, so it must not disappear underneath
    // them - and only the rows are replaced by placeholders.
    loading = false,
}) => {
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [types, setTypes] = useState([]);
    const toggleType = (key) =>
        setTypes((prev) => (prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]));
    const typeLabel =
        types.length === 0
            ? "All types"
            : types.length === 1
                ? TYPE_GROUPS[types[0]].label
                : `${types.length} types`;

    // Everything before the chosen range arrives as a single opening line, so
    // the running balance starts from where the party actually stood. Both
    // sides carry their own. What raises Receivable is a Debit; what raises
    // Payable is a Credit (fix plan 3.1).
    const carried = (amount, side, extra) => {
        const raises = amount > 0 ? amount : 0;
        const lowers = amount < 0 ? -amount : 0;
        const payable = side === "payable";
        return {
            date: dateFrom ? formatDate(dateFrom) : "-",
            description: "Brought forward",
            reference: "-",
            debit: payable ? lowers : raises,
            credit: payable ? raises : lowers,
            ...extra,
        };
    };
    let carriedRows = [];
    if (sides) {
        const forward = ledger?.brought_forward || {};
        const both = { receivable_balance: forward.receivable || 0, payable_balance: forward.payable || 0 };
        carriedRows = Object.keys(SIDE_LABEL)
            .filter((side) => forward[side])
            .map((side) => carried(forward[side], side, { side, ...both }));
    } else if (ledger?.brought_forward) {
        carriedRows = [carried(ledger.brought_forward, ledger.side, { balance: ledger.brought_forward })];
    }

    // A row split across sides reads "<description> · advance": filter on
    // the description before the suffix.
    const keptDescriptions = new Set(types.flatMap((key) => TYPE_GROUPS[key]?.match || []));
    const keep = (row) =>
        types.length === 0 || keptDescriptions.has(String(row.description || "").split(" · ")[0]);

    // Newest first (fix plan 3.3): the latest row, carrying the closing
    // balance, at the top; what was brought forward at the foot. The server
    // works the balances out oldest-first, so only the order changes here.
    const rows = [
        ...(ledger?.rows || []).filter(keep).map((row) => ({
            ...row,
            date: formatDate(row.date),
            reference: row.reference || "-",
        })).reverse(),
        ...carriedRows,
    ].map((row, index) => ({ ...row, id: index + 1 }));

    const columns = sides ? bothCols : cols;

    return (
        /* Sticky from here down: once the heading reaches the top of the
           window it stays there, along with the date range and the column
           header, and only the rows carry on scrolling underneath. The three
           sit in one container so the column header needs no top offset of
           its own - a number that would differ per page and drift whenever a
           heading or a button changed. */
        <div>
        <div className="sticky top-0 z-20 bg-background pt-4 pb-[10px] space-y-4">
            <div className="flex flex-wrap items-center gap-4">
                <h2 className="text-xl font-semibold">
                    {title} {loading ? "" : `(${listCountLabel(rows)})`}
                </h2>
                {titleExtra}
            </div>

            {/* Date range on the left, any party actions on the right, so the
                whole control strip reads as one row. */}
            <div className="flex items-end justify-between flex-wrap gap-4">
                <div className="flex items-end space-x-4">
                    {typeFilter && (
                        <div className="space-y-1">
                            <Label htmlFor="ledger_type">Type</Label>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        id="ledger_type"
                                        type="button"
                                        className="flex h-10 w-44 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    >
                                        <span className="truncate">{typeLabel}</span>
                                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                                    </button>
                                </DropdownMenuTrigger>
                                {/* Ticking keeps the menu open, so several types can be picked in one go. */}
                                <DropdownMenuContent align="start" className="w-44">
                                    <DropdownMenuCheckboxItem
                                        checked={types.length === 0}
                                        onCheckedChange={() => setTypes([])}
                                        onSelect={(e) => e.preventDefault()}
                                    >
                                        All types
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuSeparator />
                                    {Object.entries(TYPE_GROUPS).map(([key, group]) => (
                                        <DropdownMenuCheckboxItem
                                            key={key}
                                            checked={types.includes(key)}
                                            onCheckedChange={() => toggleType(key)}
                                            onSelect={(e) => e.preventDefault()}
                                        >
                                            {group.label}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}
                    <div className="space-y-1">
                        <Label htmlFor="date_from">From</Label>
                        <Input
                            id="date_from"
                            type="date"
                            className="w-48"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="date_to">To</Label>
                        <Input
                            id="date_to"
                            type="date"
                            className="w-48"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                        />
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => onRangeApply(dateFrom, dateTo)}
                    >
                        Apply
                    </Button>
                </div>

                {actions}
            </div>

            {loading || rows.length > 0 ? (
                <DataTable columns={columns} headerOnly />
            ) : null}
        </div>

        {loading ? (
            <DataTable columns={columns} rowsOnly loading />
        ) : rows.length > 0 ? (
            <DataTable
                columns={columns}
                data={rows}
                selectedRows={[]}
                onRowClick={() => { }}
                rowsOnly
            />
        ) : (
            <div className="bg-card rounded-lg p-6 border">
                <p className="text-sm text-muted-foreground">
                    Nothing recorded for this party yet.
                </p>
            </div>
        )}
        </div>
    );
};

export default PartyLedgerSection;
