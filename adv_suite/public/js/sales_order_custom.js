// Extender la clase SalesOrderController
class CustomSalesOrderController extends erpnext.selling.SalesOrderController {
    make_work_order() {
        var me = this;
        me.frm.call({
            method: "erpnext.selling.doctype.sales_order.sales_order.get_work_order_items",
            args: {
                sales_order: this.frm.docname,
            },
            freeze: true,
            callback: function(r) {
                if (!r.message) {
                    frappe.msgprint({
                        title: __("Work Order not created"),
                        message: __("No Items with Bill of Materials to Manufacture"),
                        indicator: "orange",
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
                                    in_list_view: 1,
                                },
                                {
                                    fieldtype: "Link",
                                    fieldname: "bom",
                                    options: "BOM",
                                    reqd: 1,
                                    read_only: 1, // Hacer el campo bom de solo lectura
                                    label: __("Select BOM"),
                                    in_list_view: 1,
                                    get_query: function(doc) {
                                        return { filters: { item: doc.item_code } };
                                    },
                                },
                                {
                                    fieldtype: "Float",
                                    fieldname: "pending_qty",
                                    reqd: 1,
                                    label: __("Qty"),
                                    in_list_view: 1,
                                },
                                {
                                    fieldtype: "Data",
                                    fieldname: "sales_order_item",
                                    reqd: 1,
                                    label: __("Sales Order Item"),
                                    hidden: 1,
                                },
                            ],
                            data: r.message,
                            get_data: () => {
                                return r.message;
                            },
                        },
                    ];
                    var d = new frappe.ui.Dialog({
                        title: __("Select Items to Manufacture"),
                        fields: fields,
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
                                    project: me.frm.project,
                                },
                                freeze: true,
                                callback: function(r) {
                                    if (r.message) {
                                        frappe.msgprint({
                                            message: __("Work Orders Created: {0}", [
                                                r.message
                                                    .map(function(d) {
                                                        return repl(
                                                            '<a href="/app/work-order/%(name)s">%(name)s</a>',
                                                            { name: d }
                                                        );
                                                    })
                                                    .join(", "),
                                            ]),
                                            indicator: "green",
                                        });
                                    }
                                    d.hide();
                                },
                            });
                        },
                        primary_action_label: __("Create"),
                    });

                    d.show();
                }
            },
        });
    }
};


// Asignar la nueva clase a erpnext.selling.SalesOrderController
erpnext.selling.SalesOrderController = CustomSalesOrderController;

// Aplicar la nueva clase al formulario actual
extend_cscript(cur_frm.cscript, new erpnext.selling.SalesOrderController({ frm: cur_frm }));
