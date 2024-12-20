(() => {
  // ../adv_suite/adv_suite/public/js/stock_entry/stock_entry_custom.js
  var CustomStockEntry = class extends erpnext.stock.StockEntry {
    get_items() {
      var me = this;
      if (!this.frm.doc.posting_date) {
        this.frm.doc.posting_date = frappe.datetime.nowdate();
      }
      if (!this.frm.doc.posting_time) {
        this.frm.doc.posting_time = frappe.datetime.now_time();
      }
      if (!this.frm.doc.fg_completed_qty || !this.frm.doc.bom_no)
        frappe.throw(__("BOM and Manufacturing Quantity are required"));
      if (this.frm.doc.work_order || this.frm.doc.bom_no) {
        return this.frm.call({
          doc: me.frm.doc,
          freeze: true,
          method: "get_items",
          callback: function(r) {
            if (!r.exc)
              refresh_field("items");
            if (me.frm.doc.bom_no) {
              attach_bom_items(me.frm.doc.bom_no);
              erpnext.accounts.dimensions.update_dimension(me.frm, me.frm.doctype);
            }
          }
        });
      }
    }
  };
  erpnext.stock.StockEntry = CustomStockEntry;
  extend_cscript(cur_frm.cscript, new erpnext.stock.StockEntry({ frm: cur_frm }));
})();
//# sourceMappingURL=stock_entry.bundle.L2MOQ76W.js.map
