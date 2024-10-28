frappe.ui.form.on('Quotation', {
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
                        margin_rate_or_amount: item.margin_rate_or_amount,
                        rate_with_margin: item.rate_with_margin
                    },
                    callback: function(r) {
                        if (!r.exc) {
                            console.log(`BOM ${item.custom_bom} updated successfully`);
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
    },
});

frappe.ui.form.on('Quotation Item', {
    custom_bom: function(frm, cdt, cdn) {
        custom_bom(frm, cdt, cdn);
        add_recalculate_button(frm);
        // let item = locals[cdt][cdn];
        // if (item.custom_bom) {
        //     // Recuperar el BOM seleccionado
        //     frappe.db.get_doc('BOM', item.custom_bom)
        //         .then(bom => {
        //             // Leer los campos del BOM
        //             let total_cost = bom.total_cost || 0;
        //             let custom_margin_type = bom.custom_margin_type || '';
        //             let custom_margin_rate_or_amount = bom.custom_margin_rate_or_amount || 0;
        //             let custom_rate_with_margin = bom.custom_rate_with_margin || 0;

        //             if (custom_margin_type === 'Percentage') {
        //                 custom_margin_rate_or_amount = custom_rate_with_margin - total_cost;
        //                 custom_margin_type = 'Amount';
        //             }

        //             // Asignar los valores a los campos del Quotation Item
        //             frappe.model.set_value(cdt, cdn, 'custom_total_cost_of_bom', total_cost);
        //             frappe.model.set_value(cdt, cdn, 'price_list_rate', total_cost);
        //             frappe.model.set_value(cdt, cdn, 'base_price_list_rate', total_cost);
        //             frappe.model.set_value(cdt, cdn, 'rate', total_cost);
        //             frappe.model.set_value(cdt, cdn, 'margin_type', custom_margin_type);
        //             frappe.model.set_value(cdt, cdn, 'margin_rate_or_amount', custom_margin_rate_or_amount);

        //             // // Cambiar los labels de los campos
        //             // frm.fields_dict.items.grid.update_docfield_property('price_list_rate', 'label', __('Total Cost of BOM'));
        //             // frm.fields_dict.items.grid.update_docfield_property('base_price_list_rate', 'label', __('Total Cost of BOM (Default Rate)'));
        //         });
        // }
    },
    items_remove: function(frm) {
        console.log('Item removed');
        add_recalculate_button(frm);
    },
    refresh: function(frm) {
        frm.doc.items.forEach(item => {
            item.__unsaved_margin_type = item.margin_type;
            item.__unsaved_margin_rate_or_amount = item.margin_rate_or_amount;
            item.__unsaved_custom_rate_with_margin = item.rate_with_margin;

            // // Cambiar los labels de los campos si custom_bom está presente
            // if (item.custom_bom) {
            //     frm.fields_dict.items.grid.update_docfield_property('price_list_rate', 'label', __('Total Cost of BOM'));
            //     frm.fields_dict.items.grid.update_docfield_property('base_price_list_rate', 'label', __('Total Cost of BOM (Default Rate)'));
            // }
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

                if (custom_margin_type === 'Percentage') {
                    custom_margin_rate_or_amount = flt(custom_rate_with_margin) - flt(total_cost);
                    custom_margin_type = 'Amount';
                }

                // Asignar los valores a los campos del Quotation Item
                frappe.model.set_value(cdt, cdn, 'custom_total_cost_of_bom', total_cost)
                    .then(() => frappe.model.set_value(cdt, cdn, 'price_list_rate', total_cost))
                    .then(() => frappe.model.set_value(cdt, cdn, 'base_price_list_rate', total_cost))
                    .then(() => frappe.model.set_value(cdt, cdn, 'rate', total_cost))
                    .then(() => frappe.model.set_value(cdt, cdn, 'margin_type', custom_margin_type))
                    .then(() => frappe.model.set_value(cdt, cdn, 'margin_rate_or_amount', custom_margin_rate_or_amount));
            });
    }
}

function add_recalculate_button(frm) {
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
// versión para debuguear
// function recalculate_prices(frm) {
//     if (frm.doc.items && frm.doc.items.length > 0) {
//         frm.doc.items.forEach(item => {
//             if (item.custom_bom) {
//                 console.log(`Recalculating price for item: ${item.name}`);
//                 // Llamar a la función custom_bom
//                 custom_bom(frm, item.doctype, item.name);
//             }
//         });
//     }
// }

// function custom_bom(frm, cdt, cdn) {
//     let item = locals[cdt][cdn];
//     if (item.custom_bom) {
//         console.log(`Processing custom_bom for item: ${item.name}`);
//         // Recuperar el BOM seleccionado
//         frappe.db.get_doc('BOM', item.custom_bom)
//             .then(bom => {
//                 console.log(`BOM retrieved for item: ${item.name}`);
//                 // Leer los campos del BOM
//                 let total_cost = bom.total_cost || 0;
//                 let custom_margin_type = bom.custom_margin_type || '';
//                 let custom_margin_rate_or_amount = bom.custom_margin_rate_or_amount || 0;
//                 let custom_rate_with_margin = bom.custom_rate_with_margin || 0;

//                 console.log(`Initial values for item: ${item.name}`);
//                 console.log(`total_cost: ${total_cost}`);
//                 console.log(`custom_margin_type: ${custom_margin_type}`);
//                 console.log(`custom_margin_rate_or_amount: ${custom_margin_rate_or_amount}`);
//                 console.log(`custom_rate_with_margin: ${custom_rate_with_margin}`);

//                 if (custom_margin_type === 'Percentage') {
//                     custom_margin_rate_or_amount = flt(custom_rate_with_margin) - flt(total_cost);
//                     custom_margin_type = 'Amount';
//                 }

//                 console.log(`Updated values for item: ${item.name}`);
//                 console.log(`custom_margin_rate_or_amount: ${custom_margin_rate_or_amount}`);
//                 console.log(`custom_margin_type: ${custom_margin_type}`);

//                 // Verificar el estado del formulario antes de la actualización
//                 console.log(`State before update for item: ${item.name}`);
//                 console.log(`custom_total_cost_of_bom: ${locals[cdt][cdn].custom_total_cost_of_bom}`);
//                 console.log(`price_list_rate: ${locals[cdt][cdn].price_list_rate}`);
//                 console.log(`base_price_list_rate: ${locals[cdt][cdn].base_price_list_rate}`);
//                 console.log(`rate: ${locals[cdt][cdn].rate}`);
//                 console.log(`margin_type: ${locals[cdt][cdn].margin_type}`);
//                 console.log(`margin_rate_or_amount: ${locals[cdt][cdn].margin_rate_or_amount}`);

//                 // Asignar los valores a los campos del Quotation Item
//                 frappe.model.set_value(cdt, cdn, 'custom_total_cost_of_bom', total_cost)
//                     .then(() => {
//                         console.log(`custom_total_cost_of_bom set to: ${total_cost} for item: ${item.name}`);
//                         return frappe.model.set_value(cdt, cdn, 'price_list_rate', total_cost);
//                     })
//                     .then(() => {
//                         console.log(`price_list_rate set to: ${total_cost} for item: ${item.name}`);
//                         return frappe.model.set_value(cdt, cdn, 'base_price_list_rate', total_cost);
//                     })
//                     .then(() => {
//                         console.log(`base_price_list_rate set to: ${total_cost} for item: ${item.name}`);
//                         return frappe.model.set_value(cdt, cdn, 'rate', total_cost);
//                     })
//                     .then(() => {
//                         console.log(`rate set to: ${total_cost} for item: ${item.name}`);
//                         return frappe.model.set_value(cdt, cdn, 'margin_type', custom_margin_type);
//                     })
//                     .then(() => {
//                         console.log(`margin_type set to: ${custom_margin_type} for item: ${item.name}`);
//                         return frappe.model.set_value(cdt, cdn, 'margin_rate_or_amount', custom_margin_rate_or_amount);
//                     })
//                     .then(() => {
//                         console.log(`margin_rate_or_amount set to: ${custom_margin_rate_or_amount} for item: ${item.name}`);
//                         console.log(`Values set for item: ${item.name}`);

//                         // Verificar el estado del formulario después de la actualización
//                         console.log(`State after update for item: ${item.name}`);
//                         console.log(`custom_total_cost_of_bom: ${locals[cdt][cdn].custom_total_cost_of_bom}`);
//                         console.log(`price_list_rate: ${locals[cdt][cdn].price_list_rate}`);
//                         console.log(`base_price_list_rate: ${locals[cdt][cdn].base_price_list_rate}`);
//                         console.log(`rate: ${locals[cdt][cdn].rate}`);
//                         console.log(`margin_type: ${locals[cdt][cdn].margin_type}`);
//                         console.log(`margin_rate_or_amount: ${locals[cdt][cdn].margin_rate_or_amount}`);
//                     });
//             });
//     }
// }