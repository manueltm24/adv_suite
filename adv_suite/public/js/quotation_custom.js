frappe.ui.form.on('Quotation', {
    onload: function(frm) {
    },
    custom_project: function(frm) {
        if (frm.doc.custom_project) {
            // Recuperar el proyecto
            frappe.db.get_doc('Project', frm.doc.custom_project)
                .then(project => {
                    if (project.customer) {
                        // Establecer el valor del campo customer en el campo party_name
                        frm.set_value('party_name', project.customer);
                        // frm.set_value('party', 'Customer');  // Asegurarse de que el campo dinámico 'party' esté configurado correctamente
                    }
                });
        }
    },
    before_save: function(frm) {
        frm.doc.items.forEach(item => {
            if (item.custom_bom && (item.margin_type !== item.__unsaved_margin_type || item.margin_rate_or_amount !== item.__unsaved_margin_rate_or_amount)) {
                // Actualizar el BOM asociado
                frappe.call({
                    method: 'adv_suite.api.update_bom',
                    args: {
                        bom_name: item.custom_bom,
                        margin_type: item.margin_type,
                        margin_rate_or_amount: (item.margin_rate_or_amount)*100/(item.rate_with_margin - item.margin_rate_or_amount),
                        margin_amount: item.margin_rate_or_amount,
                        rate_with_margin: item.rate_with_margin
                    },
                    callback: function(r) {
                        if (!r.exc) {
                            console.log(`BOM ${item.custom_bom} ${item.custom_bom} ${item.custom_bom} ${item.custom_bom} ${item.custom_bom} updated successfully`);
                        } else {
                            console.error(`Error updating BOM ${item.custom_bom}:`, r.exc);
                        }
                    }
                });

                // Actualizar la lista de precios seleccionada
                if (frm.doc.selling_price_list) {
                    frappe.call({
                        method: 'frappe.client.get_list',
                        args: {
                            doctype: 'Item Price',
                            filters: {
                                price_list: frm.doc.selling_price_list,
                                item_code: item.item_code
                            },
                            fields: ['name']
                        },
                        callback: function(r) {
                            if (r.message && r.message.length > 0) {
                                let item_price_name = r.message[0].name;
                                frappe.call({
                                    method: 'frappe.client.set_value',
                                    args: {
                                        doctype: 'Item Price',
                                        name: item_price_name,
                                        fieldname: 'price_list_rate',
                                        value: item.custom_total_cost_of_bom
                                    },
                                    callback: function(r) {
                                        if (!r.exc) {
                                            console.log(`Price for item ${item.item_code} in price list ${frm.doc.selling_price_list} updated successfully`);
                                        } else {
                                            console.error(`Error updating price for item ${item.item_code} in price list ${frm.doc.selling_price_list}:`, r.exc);
                                        }
                                    }
                                });
                            } else {
                                console.error(`Item Price not found for item ${item.item_code} in price list ${frm.doc.selling_price_list}`);
                            }
                        }
                    });
                }
            }
        });
    },

    refresh: function(frm) {
        add_recalculate_button(frm);
        // Verifica si el usuario tiene el rol "AUXILIAR ALMACEN" y no es Administrador
        if (frappe.user.has_role("AUXILIAR ALMACEN") && !frappe.user.has_role("Administrator")) {
            // Itera sobre la tabla de elementos de la cotización y establece los precios a cero
            frm.doc.items.forEach(item => {
                frappe.model.set_value(item.doctype, item.name, 'rate', 0);
                frappe.model.set_value(item.doctype, item.name, 'amount', 0);
            });
            // Actualiza el total de la cotización después de cambiar los precios a cero
            frm.refresh_field('items');
            frm.refresh_fields(['total', 'grand_total', 'rounded_total']);
            frm.toggle_display("other_charges_calculation", false);
            frm.toggle_display("payment_schedule", false);
        }
        
    },
});

frappe.ui.form.on('Quotation Item', {
    custom_bom: function(frm, cdt, cdn) {
        custom_bom(frm, cdt, cdn);
        add_recalculate_button(frm);
    },
    items_remove: function(frm) {
        add_recalculate_button(frm);
    },
    refresh: function(frm) {
        frm.doc.items.forEach(item => {
            item.__unsaved_margin_type = item.margin_type;
            item.__unsaved_margin_rate_or_amount = item.margin_rate_or_amount;
            item.__unsaved_custom_rate_with_margin = item.rate_with_margin;
        });
    },
});

function recalculate_prices(frm) {
    if (frm.doc.items && frm.doc.items.length > 0) {
        frm.doc.items.forEach(item => {
            if (item.custom_bom) {
                // Llamar a la función custom_bom
                custom_bom(frm, item.doctype, item.name);
            }
        });
    }
}

function custom_bom(frm, cdt, cdn) {
    let item = locals[cdt][cdn];
    if (item.custom_bom) {
        // Recuperar el BOM seleccionado
        frappe.db.get_doc('BOM', item.custom_bom)
            .then(bom => {
                // Leer los campos del BOM
                let total_cost = bom.total_cost || 0;
                let custom_margin_type = bom.custom_margin_type || '';
                let custom_margin_rate_or_amount = bom.custom_margin_rate_or_amount || 0;
                let custom_rate_with_margin = bom.custom_rate_with_margin || 0;
                let custom_margin_amount = bom.custom_margin_amount || 0;

                if (custom_margin_type === 'Percentage') {
                    // custom_margin_rate_or_amount = flt(custom_rate_with_margin) - flt(total_cost);
                    custom_margin_type = 'Amount';
                }

                // Asignar los valores a los campos del Quotation Item
                frappe.model.set_value(cdt, cdn, 'custom_total_cost_of_bom', total_cost)
                    .then(() => frappe.model.set_value(cdt, cdn, 'price_list_rate', total_cost))
                    .then(() => frappe.model.set_value(cdt, cdn, 'base_price_list_rate', total_cost))
                    .then(() => frappe.model.set_value(cdt, cdn, 'rate', total_cost))
                    .then(() => frappe.model.set_value(cdt, cdn, 'margin_type', custom_margin_type))
                    .then(() => frappe.model.set_value(cdt, cdn, 'margin_rate_or_amount', custom_margin_amount));
            });
    }
}

function add_recalculate_button(frm) {
    if (!frappe.user.has_role("AUXILIAR ALMACEN") || frappe.user.has_role("Administrator")) {
        let has_custom_bom = frm.doc.items.some(item => item.custom_bom);

        let button = frm.fields_dict.items.grid.wrapper.find('.grid-buttons .btn:has(i.fa-refresh)');
        if (!button.length) {
            button = $('<button class="btn btn-info btn-xs btn btn-xs btn-secondary grid-add-row-1"><i class="fa fa-refresh"></i> BOM</button>')
                .click(function() {
                    recalculate_prices(frm);
                })
                .appendTo(frm.fields_dict.items.grid.wrapper.find('.grid-buttons'));
        }

        if (has_custom_bom) {
            button.show();
        } else {
            button.hide();
        }
    }
}