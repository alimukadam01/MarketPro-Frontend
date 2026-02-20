import React, { useEffect, useState } from "react";
import * as DialogUI from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { toast } from "sonner";
import { useAuth } from "../../../services/AuthProvider"
import { returnSalesInvoiceItem } from "../../../services/api";

function ReturnItem({
  invoiceId,
  invoiceItem,
  open,
  setOpen,
  setItemReturned,
}) {

  const { token } = useAuth();
  const [quantity, setQuantity] = useState(invoiceItem?.quantity);
  const [isDamaged, setIsDamaged] = useState(false);
  const [reason, setReason] = useState("");

  const onReturnItemClick = async () => {
    try {
      const isReturned = await returnSalesInvoiceItem(
        token,
        invoiceId,
        invoiceItem.id,
        quantity,
        reason
      );

      if (isReturned) {
        toast.success("Item returned successfully!");
        if (setOpen) setOpen(false);
        if (setItemReturned) setItemReturned(true);
        return;
      }

      toast.error("There was an error returning the item. Try Again.");
    } catch (error) {
      console.log("There was an error returning the item: ", error);
      toast.error("There was an error returning the item. Try Again.");
    }
  };

  useEffect(()=>{
    setQuantity(invoiceItem?.quantity)
  }, invoiceItem)

  return (
    <DialogUI.Dialog open={!!open} onOpenChange={setOpen}>
      <DialogUI.DialogContent className="max-w-2xl">
        <DialogUI.DialogHeader className="flex items-center gap-3">
          <DialogUI.DialogTitle>Return Item</DialogUI.DialogTitle>
        </DialogUI.DialogHeader>

        <div className="flex flex-wrap gap-4">
          <Label>Quantity</Label>
          <Input
            id="quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Quantity"
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <Label>Is Product Damaged?</Label>
          <Checkbox id="is_damaged" value={isDamaged} onChange={(e) => setIsDamaged(e.target.value)} />
        </div>

        <div className="flex flex-wrap gap-4">
          <Label>Description</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for returning the item"
            rows={4}
          />
        </div>

        <DialogUI.DialogFooter className="flex gap-2">
          <Button onClick={onReturnItemClick} type="button">
            Return Item
          </Button>
        </DialogUI.DialogFooter>
      </DialogUI.DialogContent>
    </DialogUI.Dialog>
  );
}

export default ReturnItem;
