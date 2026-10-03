import PartyDetail from "@/components/ui/party-detail";

// The screen itself is shared with ViewSupplier - see party-detail.tsx. The two
// differed only in a city and an address against a business name, the walk-in
// rule, and the nouns, over about five hundred otherwise identical lines.
const ViewCustomer = () => <PartyDetail party="customer" />;

export default ViewCustomer;
