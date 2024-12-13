class CustomStockEntry extends erpnext.stock.StockEntry {
    get_items() {
        var me = this;
        // Establecer la fecha y hora actuales si no están definidos
        if (!this.frm.doc.posting_date) {
            this.frm.doc.posting_date = frappe.datetime.nowdate();
        }
        if (!this.frm.doc.posting_time) {
            this.frm.doc.posting_time = frappe.datetime.now_time();
        }

        if (!this.frm.doc.fg_completed_qty || !this.frm.doc.bom_no)
            frappe.throw(__("BOM and Manufacturing Quantity are required"));

        if (this.frm.doc.work_order || this.frm.doc.bom_no) {
            // if work order / bom is mentioned, get items
            return this.frm.call({
                doc: me.frm.doc,
                freeze: true,
                method: "get_items", // Llamar al método original sin cambios
                callback: function (r) {
                    if (!r.exc) refresh_field("items");
                    if (me.frm.doc.bom_no) {
                        attach_bom_items(me.frm.doc.bom_no);
                        erpnext.accounts.dimensions.update_dimension(me.frm, me.frm.doctype);
                    }
                },
            });
        }
    }
}

// Asignar la nueva clase a erpnext.stock.StockEntry
erpnext.stock.StockEntry = CustomStockEntry;

// Aplicar la nueva clase al formulario actual
extend_cscript(cur_frm.cscript, new erpnext.stock.StockEntry({ frm: cur_frm }));
