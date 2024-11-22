frappe.ui.form.on('Job Card', {
    onload: function(frm) {
        console.log('onload');
    },
    onload_post_render: function(frm) {
        add_time_icon_to_table(frm)
    }
});
// Función para agregar el ícono de actualizar tiempo a la tabla scheduled_time_logs
function add_time_icon_to_table(frm) {
    let table_field = frm.fields_dict['scheduled_time_logs'];
    if (!table_field) {
        console.error('No se encontró el campo scheduled_time_logs');
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
    if (label_container.find('.time-update-icon').length) {
        return; // Evitar duplicados
    }

    // Insertar el ícono después del label
    label_container.css('position', 'relative');
    label_container.css('width', '100%');
    label_container.append(`
        <span class="time-update-icon control-label" 
              style="position: absolute; right: 0; top: 50%; transform: translateY(-50%); cursor: pointer; font-size: 16px;" title="${__('Copy')}">
            <svg class="icon icon-sm">
                <use xlink:href="/assets/frappe/icons/timeless/icons.svg#icon-move"></use>
            </svg>
        </span>
    `);

    // Manejar el clic en el ícono
    label_container.find('.time-update-icon').on('click', function () {
        // Obtener los valores del campo item_name de cada renglón de la tabla
        let selected_items = frm.doc.items || [];

        // Usar el separador guardado en el formulario
        // let separator = frm.bom_items_separator || '|';
        // separator = separator.replace(/\\n/g, '\n'); // Convertir "\n" a salto de línea

        // let concatenated_values = selected_items
        //     .map(item => item.item_name)
        //     .join(separator);

        // // Copiar al portapapeles
        // copy_to_clipboard(concatenated_values);

        // Mostrar una notificación tipo alert
        frappe.show_alert({
            message: __('Time updated'),
            indicator: 'green'
        });
    });
}
