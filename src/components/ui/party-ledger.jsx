import { useState } from "react";
import DataTable from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, listCountLabel } from "../../../services/utils";

const formatCurrency = (amount) => `PKR ${Number(amount || 0).toLocaleString()}`;

const cols = [
    { key: "id", label: "ID" },
    { key: "date", label: "Date" },
    { key: "description", label: "Description" },
    { key: "reference", label: "Reference" },
    {
        key: "naam",
        label: "Debit",
        render: (value) => (value ? formatCurrency(value) : "-"),
    },
    {
        key: "jama",
        label: "Credit",
        render: (value) => (value ? formatCurrency(value) : "-"),
    },
    {
        key: "balance",
        label: "Balance",
        render: (value) => (
            <span className="font-medium">{formatCurrency(value)}</span>
        ),
    },
];

/**
 * One party's khaata. Owns the date range inputs and hands the chosen range
 * back to the page, which does the fetching.
 *
 * title names the party kind, so the customer and supplier screens can share
 * this component and still read "Customer Ledger" / "Supplier Ledger".
 */
const PartyLedgerSection = ({
    ledger,
    onRangeApply,
    actions = null,
    title = "Ledger",
}) => {
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    const broughtForward = ledger?.brought_forward || 0;

    // Everything before the chosen range arrives as a single opening line, so
    // the running balance starts from where the party actually stood.
    const carriedRow = broughtForward
        ? [{
            id: 0,
            date: dateFrom ? formatDate(dateFrom) : "-",
            description: "Brought forward",
            reference: "-",
            naam: broughtForward > 0 ? broughtForward : 0,
            jama: broughtForward < 0 ? -broughtForward : 0,
            balance: broughtForward,
        }]
        : [];

    const rows = [
        ...carriedRow,
        ...(ledger?.rows || []).map((row, index) => ({
            id: index + 1,
            date: formatDate(row.date),
            description: row.description,
            reference: row.reference || "-",
            naam: row.naam,
            jama: row.jama,
            balance: row.balance,
        })),
    ];

    return (
        /* Sticky from here down: once the heading reaches the top of the
           window it stays there, along with the date range and the column
           header, and only the rows carry on scrolling underneath. The three
           sit in one container so the column header needs no top offset of
           its own - a number that would differ per page and drift whenever a
           heading or a button changed. */
        <div>
        <div className="sticky top-0 z-20 bg-background pt-4 pb-[10px] space-y-4">
            <h2 className="text-xl font-semibold">
                {title} ({listCountLabel(rows)})
            </h2>

            {/* Date range on the left, any party actions on the right, so the
                whole control strip reads as one row. */}
            <div className="flex items-end justify-between flex-wrap gap-4">
                <div className="flex items-end space-x-4">
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

            {rows.length > 0 ? (
                <DataTable columns={cols} headerOnly />
            ) : null}
        </div>

        {rows.length > 0 ? (
            <DataTable
                columns={cols}
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
