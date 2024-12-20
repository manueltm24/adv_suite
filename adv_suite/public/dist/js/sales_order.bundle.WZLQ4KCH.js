(() => {
  // ../adv_suite/adv_suite/public/js/sales_order/sales_order_custom.js
  var CustomSalesOrderController = class extends erpnext.selling.SalesOrderController {
    make_work_order() {
      var me = this;
      me.frm.call({
        method: "erpnext.selling.doctype.sales_order.sales_order.get_work_order_items",
        args: {
          sales_order: this.frm.docname
        },
        freeze: true,
        callback: function(r) {
          if (!r.message) {
            frappe.msgprint({
              title: __("Work Order not created"),
              message: __("No Items with Bill of Materials to Manufacture"),
              indicator: "orange"
            });
            return;
          } else {
            const fields = [
              {
                label: "Items",
                fieldtype: "Table",
                fieldname: "items",
                description: __("Select BOM and Qty for Production"),
                fields: [
                  {
                    fieldtype: "Read Only",
                    fieldname: "item_code",
                    label: __("Item Code"),
                    in_list_view: 1
                  },
                  {
                    fieldtype: "Link",
                    fieldname: "bom",
                    options: "BOM",
                    reqd: 1,
                    read_only: 1,
                    label: __("Select BOM"),
                    in_list_view: 1,
                    get_query: function(doc) {
                      return { filters: { item: doc.item_code } };
                    }
                  },
                  {
                    fieldtype: "Float",
                    fieldname: "pending_qty",
                    reqd: 1,
                    label: __("Qty"),
                    in_list_view: 1
                  },
                  {
                    fieldtype: "Data",
                    fieldname: "sales_order_item",
                    reqd: 1,
                    label: __("Sales Order Item"),
                    hidden: 1
                  }
                ],
                data: r.message,
                get_data: () => {
                  return r.message;
                }
              }
            ];
            var d = new frappe.ui.Dialog({
              title: __("Select Items to Manufacture"),
              fields,
              primary_action: function() {
                var data = { items: d.fields_dict.items.grid.get_selected_children() };
                if (!data) {
                  frappe.throw(__("Please select items"));
                }
                me.frm.call({
                  method: "make_work_orders",
                  args: {
                    items: data,
                    company: me.frm.doc.company,
                    sales_order: me.frm.docname,
                    project: me.frm.project
                  },
                  freeze: true,
                  callback: function(r2) {
                    if (r2.message) {
                      frappe.msgprint({
                        message: __("Work Orders Created: {0}", [
                          r2.message.map(function(d2) {
                            return repl(
                              '<a href="/app/work-order/%(name)s">%(name)s</a>',
                              { name: d2 }
                            );
                          }).join(", ")
                        ]),
                        indicator: "green"
                      });
                    }
                    d.hide();
                  }
                });
              },
              primary_action_label: __("Create")
            });
            d.show();
          }
        }
      });
    }
  };
  erpnext.selling.SalesOrderController = CustomSalesOrderController;
  extend_cscript(cur_frm.cscript, new erpnext.selling.SalesOrderController({ frm: cur_frm }));
  frappe.ui.form.on("Sales Order", {
    onload: function(frm) {
      $(frm.fields_dict.custom_notes.wrapper).find("textarea").css("height", "75px");
    },
    onload_post_render: function(frm) {
      $(frm.fields_dict.custom_notes.wrapper).find("textarea").css("height", "75px");
    },
    refresh: function(frm) {
      $(frm.fields_dict.custom_notes.wrapper).find("textarea").css("height", "75px");
    }
  });
})();
//# sourceMappingURL=sales_order.bundle.WZLQ4KCH.js.map
