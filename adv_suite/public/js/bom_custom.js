frappe.ui.form.on('BOM', {
    onload: function(frm) {
    },
    onload_post_render: function(frm) {
        // Aplicar personalizaciones basadas en roles
        if (frappe.user.has_role('AUXILIAR ALMACEN') && !frappe.user.has_role("Administrator")) {
            console.log('Aplicando personalizaciones basadas en roles para el formulario BOM');
            // Ocultar la línea de tiempo de los comentarios
            if (frm.timeline.wrapper) {
                frm.timeline.wrapper.hide();
            }
            apply_role_based_customizations(frm, "items");
        }
        // Recuperar los valores de los separadores desde Advertech Settings y guardarlos en el formulario
        frappe.call({
            method: 'frappe.client.get_value',
            args: {
                doctype: 'Advertech Settings',
                fieldname: ['bom_items_separator']
            },
            callback: function(r) {
                if (r.message) {
                    frm.bom_items_separator = r.message.bom_items_separator || '|';
                }
            }
        });
        add_copy_icon_to_table(frm);
    },
    custom_margin_type: function(frm) {
        reset_margin_fields(frm);
        toggle_margin_fields(frm);
        calculate_margin_values(frm);    
    },
    custom_margin_rate_or_amount: function(frm) {
        // Recalcular los valores cuando custom_margin_rate_or_amount cambie
        calculate_margin_values(frm);
    },
    custom_margin_amount: function(frm) {
        // Recalcular los valores cuando custom_margin_amount cambie
        calculate_margin_values(frm);
    },
    items_on_form_rendered(doc, doctype,docname) {
        // se ejecuta cuando se renderiza el formulario modal
	},
    before_submit: function(frm) {
        if (!frm.doc.custom_warehouse_verified_materials) {
            frappe.msgprint(__('Es requerido confirmar que se ha realizado la verificación por Almacén de la disponibilidad de materiales.'));
            frappe.validated = false;
        }
    },

});

function calculate_margin_values(frm) {
    let effective_item_rate = frm.doc.total_cost || 0;

    if (frm.doc.custom_margin_type) {

        if (frm.doc.custom_margin_type == "Percentage") {
            let margin_rate_or_amount = frm.doc.custom_margin_rate_or_amount || 0;
            let margin_amount = flt(effective_item_rate) * (flt(margin_rate_or_amount) / 100);
            frm.set_value('custom_margin_amount', margin_amount);
            frm.set_value('custom_rate_with_margin', flt(effective_item_rate) + margin_amount);
        } else if (frm.doc.custom_margin_type == "Amount"){
            let margin_amount = frm.doc.custom_margin_amount || 0;
            let margin_rate_or_amount = (flt(margin_amount) / flt(effective_item_rate)) * 100;
            frm.set_value('custom_margin_rate_or_amount', margin_rate_or_amount);
            frm.set_value('custom_rate_with_margin', flt(effective_item_rate) + flt(margin_amount));
        }else{
            console.log('No se ha seleccionado un tipo de margen');
            frm.set_value('custom_rate_with_margin', effective_item_rate);
        }

        if (!frm.doc.custom_margin_type) {
            toggle_margin_fields(frm);
        } else {
            if (frm.doc.custom_margin_type == "Percentage") {
                frm.toggle_display('custom_margin_rate_or_amount', true);
                if (frm.doc.custom_margin_rate_or_amount == 0) {
                    frm.toggle_display('custom_margin_amount', false);
                }else{
                    frm.toggle_display('custom_margin_amount', true);
                    frm.set_df_property('custom_margin_amount', 'read_only', 1);
                }        
            } else if (frm.doc.custom_margin_type == "Amount"){
                frm.toggle_display('custom_margin_amount', true);

                if (frm.doc.custom_margin_amount == 0) {
                    frm.toggle_display('custom_margin_rate_or_amount', false);
                }else{
                    frm.toggle_display('custom_margin_rate_or_amount', true);
                    frm.set_df_property('custom_margin_rate_or_amount', 'read_only', 1);
                }
        
            }
        }

    }else{
        console.log('No se ha seleccionado un tipo de margen**');
        frm.set_value('custom_rate_with_margin', effective_item_rate);
    }
}

function reset_margin_fields(frm) {
    frm.set_value('custom_margin_rate_or_amount', 0);
    frm.set_value('custom_margin_amount', 0);
    frm.set_df_property('custom_margin_rate_or_amount', 'read_only', 0);
    frm.set_df_property('custom_margin_amount', 'read_only', 0);
}

function toggle_margin_fields(frm) {
    frm.toggle_display('custom_margin_rate_or_amount', false);
    frm.toggle_display('custom_margin_amount', false);
}


frappe.ui.form.on('BOM Item', {
    form_render: function(frm, cdt, cdn) {
        if (frappe.user.has_role('AUXILIAR ALMACEN') && !frappe.user.has_role("Administrator")) {

            let item = locals[cdt][cdn];

            // Lista de columnas a ocultar en el formulario modal
            let columns_to_hide = ['rate', 'amount', 'base_rate', 'base_amount'];

            // Iterar sobre la lista y ocultar cada columna
            columns_to_hide.forEach(column => {
                frm.fields_dict['items'].grid.toggle_display(column, false, item.name);
            });

                    // Obtener la fila del grid
        let grid_row = frm.fields_dict['items'].grid.grid_rows_by_docname[cdn];

        // Obtener el elemento del DOM que representa la fila
        let row_element = grid_row.wrapper[0];

        // Crear un MutationObserver para observar los cambios en las clases del elemento
        let observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'class') {
                    if (!row_element.classList.contains('grid-row-open')) {
                        apply_role_based_customizations(frm, "items");
                        // console.log('Formulario cerrado para el item:', cdn);
                    }
                }
            });
        });

        // Configurar el MutationObserver para observar los cambios en los atributos del elemento
        observer.observe(row_element, { attributes: true });

        }
    }
});


function hide_columns(frm, fields, table) {
    let grid = frm.get_field(table).grid;
    
    for (let field of fields) {
        grid.fields_map[field].hidden = 1;
    }
    
    grid.visible_columns = undefined;
    grid.setup_visible_columns();
    
    grid.header_row.wrapper.remove();
    delete grid.header_row;
    grid.make_head();
    
    for (let row of grid.grid_rows) {
        if (row.open_form_button) {
            row.open_form_button.parent().remove();
            delete row.open_form_button;
        }
        
        for (let field in row.columns) {
            if (row.columns[field] !== undefined) {
                row.columns[field].remove();
            }
        }
        delete row.columns;
        row.columns = [];
        row.render_row();
    }
}

function hide_tabs(frm, fields, dn) {
    prefix = dn.toLowerCase().replace(/ /g, '_');
    fields.forEach(fieldname => {
        let tab_id = `#${prefix}-${fieldname}`;
        let tab_link_id = `#${prefix}-${fieldname}-tab`;

        let tab = document.querySelector(tab_id);
        let tab_link = document.querySelector(tab_link_id);

        if (tab) {
            tab.remove();
        }
        if (tab_link) {
            tab_link.remove();
        }
    });
}

function hide_row_check(frm, table) {
    
    setTimeout(function () {
        let grid = frm.get_field(table).grid;

        grid.grid_rows.forEach(row => {
            row.row_check[0].hidden=1;
        });
    
        grid.header_row.row_check[0].hidden=1;

    }, 50);
}

function hide_row_index(frm, table) {
    
    setTimeout(function () {
        let grid = frm.get_field(table).grid;

        grid.grid_rows.forEach(row => {
            row.row_index[0].hidden=1;
        });
    
        grid.header_row.row_index[0].hidden=1;
    }, 50);

}

function hide_last_column(frm, table) {

    setTimeout(function () {
        let grid = frm.get_field(table).grid;

        grid.grid_rows.forEach(row => {
            row.open_form_button[0].parentElement.remove();
        });
    
        // grid.header_row.configure_columns_button[0].parentElement.remove();
        let header_columns = grid.wrapper[0].querySelectorAll('.grid-static-col.d-flex.justify-content-center');
        if (header_columns.length > 0) {
            header_columns[header_columns.length - 1].remove();
        }
    }, 50);

}

function apply_role_based_customizations(frm, table) {

    apply_tabs_role_based_customizations(frm, table);

    apply_table_role_based_customizations(frm, table);
}

function apply_tabs_role_based_customizations(frm, table) {
    // Ocultar tabs
    tabs_links = ['section_break_21', 'scrap_section', 'costing', 'more_info_tab'];
    hide_tabs(frm, tabs_links, frm.doctype);
}
function apply_table_role_based_customizations(frm, table) {
    // Ocultar columnas del grid
    fields = ['rate', 'amount', 'base_rate', 'base_amount'];
    hide_columns(frm, fields, table)

    // Ocultar la primera columna del grid
    hide_row_check(frm, table);

    // Ocultar la columna de índice del grid (ok)
    // hide_row_index(frm, table);
    
    // Ocultar la última columna del grid
    hide_last_column(frm, table);
    
    // Ocultar fotter del grid
    // frm.fields_dict['items'].grid.wrapper.find('.grid-footer').hide();
}

// Función para agregar el ícono de copiar a la tabla custom_project_materials
function add_copy_icon_to_table(frm) {
    let table_field = frm.fields_dict['items'];
    if (!table_field) {
        console.error('No se encontró el campo custom_project_materials');
        return;
    }

    // Buscar el contenedor .form-column del campo
    let form_column = table_field.$wrapper.closest('.form-column');

    // Si no encontramos el .form-column, detener
    if (!form_column.length) {
        console.error('No se encontró el contenedor .form-column');
        return;
    }

    // Buscar el label dentro del contenedor
    let label_container = table_field.$wrapper.find('.control-label');
    if (!label_container.length) {
        console.error('No se encontró el contenedor del label (.control-label)');
        return;
    }

    // Verificar si el ícono ya fue agregado
    if (label_container.find('.copy-content-icon').length) {
        return; // Evitar duplicados
    }

    // Insertar el ícono después del label
    label_container.css('position', 'relative');
    label_container.css('width', '100%');
    label_container.append(`
        <span class="copy-content-icon control-label" 
              style="position: absolute; right: 0; top: 50%; transform: translateY(-50%); cursor: pointer; font-size: 16px;" title="${__('Copy')}">
            <svg class="icon icon-sm">
                <use xlink:href="/assets/frappe/icons/timeless/icons.svg#icon-duplicate"></use>
            </svg>
        </span>
    `);

    // Manejar el clic en el ícono
    label_container.find('.copy-content-icon').on('click', function () {
        // Obtener los valores del campo item_name de cada renglón de la tabla
        let selected_items = frm.doc.items || [];

        // Usar el separador guardado en el formulario
        let separator = frm.bom_items_separator || '|';
        separator = separator.replace(/\\n/g, '\n'); // Convertir "\n" a salto de línea

        let concatenated_values = selected_items
            .map(item => item.item_name)
            .join(separator);

        // Copiar al portapapeles
        copy_to_clipboard(concatenated_values);

        // Mostrar una notificación tipo alert
        frappe.show_alert({
            message: __('Copied to clipboard'),
            indicator: 'green'
        });
    });
}

// Función para copiar texto al portapapeles
function copy_to_clipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
}
