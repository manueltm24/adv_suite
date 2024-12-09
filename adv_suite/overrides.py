import frappe
from pypika import functions as fn
from erpnext.manufacturing.doctype.work_order.work_order import WorkOrder

class CustomWorkOrder(WorkOrder):
    def update_transferred_qty_for_required_items(self):
        ste = frappe.qb.DocType("Stock Entry")
        ste_child = frappe.qb.DocType("Stock Entry Detail")
        query = (
            frappe.qb.from_(ste)
            .inner_join(ste_child)
            .on(ste_child.parent == ste.name)
            .select(
                ste_child.item_code,
                ste_child.original_item,
                fn.Sum(ste_child.qty).as_("qty"),
            )
            .where(
                (ste.docstatus == 1)
                & (ste.work_order == self.name)
                & ((ste.purpose == "Material Transfer for Manufacture") | (ste.purpose == "Material Transfer"))
                & (ste.is_return == 0)
            )
            .groupby(ste_child.item_code)
        )

        data = query.run(as_dict=1) or []
        transferred_items = frappe._dict({d.original_item or d.item_code: d.qty for d in data})

        for row in self.required_items:
            row.db_set(
                "transferred_qty", (transferred_items.get(row.item_code) or 0.0), update_modified=False
            )
