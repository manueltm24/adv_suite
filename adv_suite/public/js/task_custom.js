frappe.ui.form.on('Task', {
    onload_post_render: function (frm) {
        frm.get_field("custom_project_materials").grid.set_multiple_add("item_code");
        // Recuperar los valores de los separadores desde Advertech Settings y guardarlos en el formulario
        frappe.call({
            method: 'frappe.client.get_value',
            args: {
                doctype: 'Advertech Settings',
                fieldname: ['product_finished_separator', 'project_materials_separator']
            },
            callback: function(r) {
                if (r.message) {
                    frm.product_finished_separator = r.message.product_finished_separator || '|';
                    frm.project_materials_separator = r.message.project_materials_separator || '|';
                }
            }
        });
        // Verificar si el campo type está establecido a "Producto"
        if (frm.doc.type === "Producto") {
            // Desencadenar el evento type
            frm.trigger('type');
        }
        $(frm.fields_dict.custom_size.wrapper).find('textarea').css('height', '85px');
        add_style_to_label(frm, 'custom_size');
        // Establecer un tamaño mínimo para el campo custom_product_finish
        set_min_size_for_field(frm, 'custom_product_finish', 'auto', '85px');

    },    
    refresh: function (frm) {
        AttachmentObserverManager.start(frm);
        initializeImageSlider(frm);
        frm.attachments.refresh = function () {
            frm.refresh();
        };
    },
    onload: function (frm) {
        AttachmentObserverManager.start(frm);
    },
    before_unload: function () {
        AttachmentObserverManager.stop();
    },
    type: function(frm) {
        // Obtener la referencia al campo multiselect
        let field = frm.fields_dict['custom_product_finish']; 
        if (field && field.$wrapper) {
            add_copy_icon_to_label(field, frm);
            add_copy_icon_to_table(frm);
            // add_copy_icon_to_multiselect(field, frm);
        }
    }
});


frappe.ui.form.on('Project Materials', {
    item_code: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.item_code) {
            frappe.db.get_value('Item', { 'name': row.item_code }, 'item_name', (r) => {
                if (r && r.item_name) {
                    frappe.model.set_value(cdt, cdn, 'item_name', r.item_name);
                } else {
                    frappe.msgprint(__('Item Code {0} not found', [row.item_code]));
                }
            });
        }
    },
    item_name: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.item_name) {
            frappe.db.get_value('Item', { 'item_name': row.item_name }, 'name', (r) => {
                if (r && r.name) {
                    frappe.model.set_value(cdt, cdn, 'item_code', r.name);
                } else {
                    frappe.msgprint(__('Item Name {0} not found', [row.item_name]));
                }
            });
        }
    }
});

// Función para agregar el ícono de copiar al campo multiselect
// Agregar un contenedor con ícono ** dentro del campo **
function add_copy_icon_to_multiselect(field, frm) {
    // Verificar si el ícono ya fue agregado para evitar duplicados
    if (field.$wrapper.find('.copy-multiselect-icon').length) {
        return;
    }

    // Agregar un contenedor con ícono dentro del campo
    field.$wrapper.append(`
        <span class="copy-multiselect-icon" 
              style="position: absolute; top: 50%; right: 10px; transform: translateY(-50%); cursor: pointer; font-size: 16px;" title="${__('Copy')}">
            <svg class="icon icon-sm">
                <use xlink:href="/assets/frappe/icons/timeless/icons.svg#icon-duplicate"></use>
            </svg>
        </span>
    `);

    // Manejar el clic en el ícono
    field.$wrapper.find('.copy-multiselect-icon').on('click', function () {
        // Obtener los valores seleccionados del multiselect
        let selected_items = field.value || [];

        // Usar el separador guardado en el formulario
        let separator = frm.product_finished_separator || '|';
        separator = separator.replace(/\\n/g, '\n'); // Convertir "\n" a salto de línea

        // Si los valores son objetos, acceder al campo específico (product_finish)
        let concatenated_values = selected_items
            .map(item => item.product_finish || item) // Cambia 'product_finish' al nombre del campo donde está la descripción
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

// Función para agregar el ícono de copiar al lado derecho del label
function add_copy_icon_to_label(field, frm) {
    // Buscar el contenedor .form-column del campo
    let form_column = field.$wrapper.closest('.form-column');

    // Si no encontramos el .form-column, detener
    if (!form_column.length) {
        console.error('No se encontró el contenedor .form-column');
        return;
    }

    // Buscar el label dentro del contenedor
    let label_container = field.$wrapper.find('.control-label');
    if (!label_container.length) {
        console.error('No se encontró el contenedor del label (.control-label)');
        return;
    }

    // Verificar si el ícono ya fue agregado
    if (label_container.find('.copy-content-icon').length) {
        return; // Evitar duplicados
    }

    // Insertar el ícono después del label
    label_container.addClass('like-disabled-input');
    label_container.css('position', 'relative');
    label_container.css('width', '100%');
    label_container.append(`
        <button class="btn icon-btn copy-content-icon" style="position: absolute; top: 0px; right: 1%;" onmouseover="this.classList.add('btn-default')" onmouseout="this.classList.remove('btn-default')" title="${__('Copy')}">
            <svg class="es-icon es-line  icon-sm" style="" aria-hidden="true">
                <use class="" href="#es-line-copy-light"></use>
            </svg>
        </button>
    `);


    // Manejar el clic en el ícono
    label_container.find('.copy-content-icon').on('click', function () {
        // Obtener los valores seleccionados del multiselect
        let selected_items = field.value || [];

        // Usar el separador guardado en el formulario
        let separator = frm.product_finished_separator || '|';
        separator = separator.replace(/\\n/g, '\n'); // Convertir "\n" a salto de línea

        // Si los valores son objetos, acceder al campo específico (product_finish)
        let concatenated_values = selected_items
            .map(item => item.product_finish || item) // Cambia 'product_finish' al nombre del campo donde está la descripción
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

// Función para agregar el ícono de copiar a la tabla custom_project_materials
function add_copy_icon_to_table(frm) {
    let table_field = frm.fields_dict['custom_project_materials'];
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
    label_container.addClass('like-disabled-input');
    label_container.css('position', 'relative');
    label_container.css('width', '100%');
    label_container.append(`
        <button class="btn icon-btn copy-content-icon" style="position: absolute; top: 0px; right: 1%;" onmouseover="this.classList.add('btn-default')" onmouseout="this.classList.remove('btn-default')" title="${__('Copy')}">
            <svg class="es-icon es-line  icon-sm" style="" aria-hidden="true">
                <use class="" href="#es-line-copy-light"></use>
            </svg>
        </button>
    `);

    // Manejar el clic en el ícono
    label_container.find('.copy-content-icon').on('click', function () {
        // Obtener los valores del campo item_name de cada renglón de la tabla
        let selected_items = frm.doc.custom_project_materials || [];

        // Usar el separador guardado en el formulario
        let separator = frm.project_materials_separator || '|';
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

function add_style_to_label(frm, fieldname) {
    let field = frm.fields_dict[fieldname];
    if (!field) {
        console.error(`No se encontró el campo ${fieldname}`);
        return;
    }

    // Buscar el contenedor .form-column del campo
    let form_column = field.$wrapper.closest('.form-column');

    // Si no encontramos el .form-column, detener
    if (!form_column.length) {
        console.error('No se encontró el contenedor .form-column');
        return;
    }

    // Buscar el label dentro del contenedor
    let label_container = field.$wrapper.find('.control-label');
    if (!label_container.length) {
        console.error('No se encontró el contenedor del label (.control-label)');
        return;
    }

    // Verificar si el ícono ya fue agregado
    if (form_column.find('.copy-icon').length) {
        return; // Evitar duplicados
    }

    label_container.addClass('like-disabled-input');
    label_container.css('position', 'relative');
    label_container.css('width', '100%');
}

function set_min_size_for_field(frm, fieldname, minWidth, minHeight) {
    let field = frm.fields_dict[fieldname];
    if (!field) {
        console.error(`No se encontró el campo ${fieldname}`);
        return;
    }

    // Aplicar estilos CSS para establecer el tamaño mínimo
    $(field.wrapper).find('.control-input').css({
        'min-width': minWidth,
        'min-height': minHeight
    });
}