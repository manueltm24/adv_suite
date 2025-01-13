frappe.ui.form.on('Quotation', {
    onload: function(frm) {
        // No quitar: Se requiere para que se muestre el filtro desde el primer elemento que se agrega
        // Establecer el filtro de BOM en la tabla de elementos de la cotización
        frm.fields_dict['items'].grid.get_field('custom_bom').get_query = function(doc, cdt, cdn) {
            let row = locals[cdt][cdn];
            if (row && row.item_code) {
                return {
                    filters: [
                        ["BOM", "item", "=", row.item_code],
                        ["BOM", "project", "=", frm.doc.custom_project]
                    ]
                };
            }
        };
        // Solo establecer el campo valid_till si el documento es nuevo
        if (frm.is_new()) {
            // Obtener el valor de default_validity_period_for_the_quotation desde Advertech Settings
            frappe.db.get_single_value('Advertech Settings', 'default_validity_period_for_the_quotation')
                .then(default_validity_period => {
                    if (default_validity_period) {
                        // Sumar el valor de default_validity_period_for_the_quotation a la fecha actual
                        let valid_till_date = frappe.datetime.add_days(frappe.datetime.nowdate(), default_validity_period);
                        frm.set_value('valid_till', valid_till_date);
                    }
                });
        }
    },
    onload_post_render: function(frm) {        
        // Ajustar la altura del campo custom_bom_description
        $(frm.fields_dict.custom_notes.wrapper).find('textarea').css('height', '75px');

    },
    custom_project: function(frm) {
        if (frm.doc.custom_project) {
            // Recuperar el proyecto
            frappe.db.get_doc('Project', frm.doc.custom_project)
                .then(project => {
                    if (project.customer) {
                        // Establecer el valor del campo customer en el campo party_name
                        frm.set_value('party_name', project.customer);
                    }
                });
        }
    },
    party_name: function(frm) {
        // Usar setTimeout para retrasar la ejecución de la lógica personalizada
        setTimeout(() => {
            // Llamar a custom_bom para cada ítem en la tabla items
            frm.doc.items.forEach(item => {
                custom_bom(frm, item.doctype, item.name);
            });
        }, 100);
    },
    before_save: function(frm) {
        console.log('before_save');
        validate_rate_with_margin(frm);
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
    before_submit: function(frm) {
        if (!frm.doc.custom_accounting_verified_credit) {
            frappe.msgprint(__('Es requerido confirmar que se ha realizado la verificación por Contabilidad del crédito y anticipo.'));
            frappe.validated = false;
        }
        // if (!frm.doc.custom_file_review) {
        //     frappe.msgprint(__('Es requerido confirmar que se ha realizado la Revisión de Archivos.'));
        //     frappe.validated = false;
        // }
        validate_warehouse_verification(frm);
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
    item_code: function(frm, cdt, cdn) {
        let item = locals[cdt][cdn];
        if (!frm.doc.party_name) {
            frappe.msgprint(__('Por favor seleccione un cliente primero.'));
            frappe.model.set_value(cdt, cdn, 'item_code', '');
            return;
        }
        apply_bom_filter(frm, cdt, cdn);
    },
    margin_rate_or_amount: function(frm, cdt, cdn) {
        console.log("Actualizar campos no guardados - margin_rate_or_amount");
        let item = locals[cdt][cdn];
        item.__unsaved_margin_type = item.margin_type;
        item.__unsaved_margin_rate_or_amount = item.margin_rate_or_amount;
        item.__unsaved_custom_rate_with_margin = item.rate_with_margin;

    },
    qty: function(frm, cdt, cdn) {
        // Usar setTimeout para retrasar la ejecución de la lógica personalizada
        setTimeout(() => {
            custom_bom(frm, cdt, cdn).then(() => {
                // Aquí puedes agregar cualquier lógica adicional que necesites ejecutar después de que se haya establecido el precio
                console.log('Precio actualizado desde custom_bom');
            });
        }, 0);
    },
});

function apply_bom_filter(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    if (row.item_code) {
        frm.fields_dict['items'].grid.get_field('custom_bom').get_query = function(doc, cdt, cdn) {
            let current_row = locals[cdt][cdn];
            return {
                filters: [
                    ["BOM", "item", "=", current_row.item_code],
                    ["BOM", "project", "=", frm.doc.custom_project]
                ]
            };
        };
        // Refrescar el campo 'custom_bom' en la fila actual
        frm.refresh_field('items');
    }
}

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

// Función para manejar la lógica específica de custom_bom
function custom_bom(frm, cdt, cdn) {
    return new Promise((resolve, reject) => {
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
                    let bom_quantity = bom.quantity || 1;

                    // Calcular el costo unitario basado en la cantidad del BOM y la cantidad de la cotización
                    let unit_cost = total_cost / bom_quantity;
                    let unit_margin_amount = custom_margin_amount / bom_quantity;
                    let rate_with_margin = unit_cost + unit_margin_amount;

                    unit_cost = flt(unit_cost);
                    unit_margin_amount = flt(unit_margin_amount);
                    rate_with_margin = unit_cost + unit_margin_amount;

                    if (custom_margin_type !== 'Amount') {
                        // custom_margin_rate_or_amount = flt(custom_rate_with_margin) - flt(total_cost);
                        custom_margin_type = 'Amount';
                    }

                    // Asignar los valores a los campos del Quotation Item
                    frappe.model.set_value(cdt, cdn, 'custom_total_cost_of_bom', unit_cost)
                        .then(() => frappe.model.set_value(cdt, cdn, 'price_list_rate', unit_cost))
                        // .then(() => frappe.model.set_value(cdt, cdn, 'qty', bom_quantity))
                        .then(() => frappe.model.set_value(cdt, cdn, 'base_price_list_rate', unit_cost))
                        .then(() => frappe.model.set_value(cdt, cdn, 'rate', unit_cost))
                        .then(() => frappe.model.set_value(cdt, cdn, 'margin_type', custom_margin_type))
                        .then(() => frappe.model.set_value(cdt, cdn, 'margin_rate_or_amount', unit_margin_amount))
                        .then(() => frappe.model.set_value(cdt, cdn, 'rate_with_margin', rate_with_margin))
                        .then(() => {
                            // Refrescar el campo 'custom_bom' en la fila actual
                            frm.refresh_field('items');
                            resolve();
                        });
                })
                .catch(err => {
                    console.error('Error al recuperar el BOM:', err);
                    reject(err);
                });
        } else {
            resolve();
        }
    });
}function add_recalculate_button(frm) {
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

// Función para validar el campo rate_with_margin antes de guardar
async function validate_rate_with_margin(frm) {
    for (let item of frm.doc.items) {
        if (item.custom_bom) {
            let bom = await frappe.db.get_doc('BOM', item.custom_bom);
            let delta = 0.05;
            console.log('BOM custom_rate_with_margin:', bom.custom_rate_with_margin, 'Item rate:', item.rate * item.qty);
            console.log('Diferencia:', Math.abs(bom.custom_rate_with_margin - item.rate * item.qty));
            if (Math.abs(bom.custom_rate_with_margin - item.rate * item.qty) > delta) {
                console.log('BOM custom_rate_with_margin:', bom.custom_rate_with_margin, 'Item rate:', item.rate);
                frappe.validated = false;
                frappe.throw(__('El precio del producto o la cantidad no coincide con el costo a cotizar del BOM, use el botón actualizar BOM, debajo de la tabla, para actualizar el precio.'));
            }
        }
    }
}

async function validate_warehouse_verification(frm) {
    for (let item of frm.doc.items) {
        if (item.custom_bom) {
            let bom = await frappe.db.get_doc('BOM', item.custom_bom);
            if (bom.docstatus === 2) { // Verificar si el BOM ha sido cancelado (docstatus = 2)
                frappe.validated = false;
                let bom_link = `<a href="/app/bom/${item.custom_bom}" target="_blank">${item.custom_bom}</a>`;
                frappe.throw(__('El BOM ha sido cancelado: ' + bom_link));
            } else if (bom.docstatus !== 1) { // Verificar que el BOM tenga estatus Submitted (docstatus = 1)
                frappe.validated = false;
                let bom_link = `<a href="/app/bom/${item.custom_bom}" target="_blank">${item.custom_bom}</a>`;
                frappe.throw(__('No se ha realizado la validación por almacén del BOM: ' + bom_link));
            }
        }
    }
}