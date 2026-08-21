import { Button } from "@/components/ui/button";
import { MessageSquare, Send } from "lucide-react";
import { partyReminderText, partyStatementText } from "../../../services/utils";

/**
 * WhatsApp actions for a customer or supplier.
 *
 * A reminder only needs the balance, so anyone who can see the party can send
 * one. A statement is the ledger itself, so it is withheld from users without
 * accounting access — offering a button that builds a statement they are not
 * allowed to see would leak it.
 */
const PartyActions = ({ name, phone, balance, ledger, canShareStatement }) => {
  const open = (text) =>
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");

  return (
    <div className="flex items-center space-x-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="flex items-center space-x-2"
        disabled={!phone}
        onClick={() => open(partyReminderText(name, balance))}
      >
        <MessageSquare className="w-4 h-4" />
        <span>Send Reminder</span>
      </Button>

      {canShareStatement && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex items-center space-x-2"
          disabled={!phone || !ledger}
          onClick={() => open(partyStatementText(name, ledger))}
        >
          <Send className="w-4 h-4" />
          <span>Share Statement</span>
        </Button>
      )}
    </div>
  );
};

export default PartyActions;
