frappe.ui.form.on('Job Card', {
    onload: function(frm) {
        console.log('onload');
    },
    onload_post_render: function(frm) {
        // add_time_icon_to_table(frm, 'scheduled_time_logs');
        add_time_icon_to_table(frm, 'time_logs');
    }
});

// Función para agregar el ícono de actualizar tiempo a una tabla
function add_time_icon_to_table(frm, table_fieldname) {
    let table_field = frm.fields_dict[table_fieldname];
    if (!table_field) {
        console.error(`No se encontró el campo ${table_fieldname}`);
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
    if (form_column.find('.time-update-icon').length) {
        return; // Evitar duplicados
    }

    label_container.addClass('like-disabled-input');
    label_container.css('position', 'relative');
    label_container.css('width', '100%');

    // Insertar el ícono fuera del label pero dentro del form-column
    form_column.css('position', 'relative');
    form_column.append(`
        <button class="btn icon-btn time-update-icon" style="position: absolute; top: 14px; right: 25px; transform: translateY(-50%);" onmouseover="this.classList.add('btn-default')" onmouseout="this.classList.remove('btn-default')"  title="${__('Set time')}">
            <svg class="es-icon es-line icon-sm" style="filter: opacity(0.55); stroke:none;" aria-hidden="true">
                <use xlink:href="/assets/adv_suite/icons/icons.svg#icon-history"></use>
            </svg>
        </button>
    `);

    // Manejar el clic en el ícono
    form_column.find('.time-update-icon').on('click', function (event) {
        handle_time_update_click(frm, table_fieldname);
    });
}

// Función para manejar el clic en el ícono de actualizar tiempo
function handle_time_update_click(frm, table_fieldname) {
    // Evitar que el evento de clic se propague al label
    event.stopPropagation();

    // Obtener el valor de expected_start_date según la tabla
    let expected_start_date;
    if (table_fieldname === 'scheduled_time_logs') {
        expected_start_date = frm.doc.expected_start_date;
    } else if (table_fieldname === 'time_logs') {
        expected_start_date = frm.doc.time_logs.length > 0 ? frm.doc.time_logs[0].from_time : frappe.datetime.now_datetime();
    }

    // Obtener el valor de time_required desde el BOM
    frappe.db.get_doc('BOM', frm.doc.bom_no).then(bom => {
        let operation = bom.operations.find(op => op.operation === frm.doc.operation);
        if (!operation) {
            frappe.msgprint(__('No se encontró la operación en el BOM.'));
            return;
        }
        let time_required = operation.time_in_mins;

        // Obtener los registros actuales de la tabla
        let time_logs = frm.doc[table_fieldname] || [];

        // Limpiar la tabla
        frm.clear_table(table_fieldname);

        if (table_fieldname === 'scheduled_time_logs') {
            handle_scheduled_time_logs(frm, expected_start_date, time_required, time_logs);
        } else if (table_fieldname === 'time_logs') {
            handle_time_logs(frm, expected_start_date, time_required, time_logs);
        }

        // Refrescar la tabla
        frm.refresh_field(table_fieldname);

        // Mostrar una notificación tipo alert
        frappe.show_alert({
            message: __('Time successfully adjusted'),
            indicator: 'green'
        });
    });
}

// Función para manejar la lógica específica de scheduled_time_logs
function handle_scheduled_time_logs(frm, expected_start_date, time_required, time_logs) {
    if (time_logs.length === 0 || time_logs.length === 1) {
        // Si la tabla está vacía o tiene 1 fila, agregar o sustituir una fila
        let from_time = expected_start_date;
        let to_time = add_minutes_to_datetime(from_time, time_required);

        frm.add_child('scheduled_time_logs', {
            from_time: from_time,
            to_time: to_time,
            time_in_mins: time_required
        });
    } else {
        // Si la tabla tiene n filas, distribuir los minutos requeridos uniformemente
        let minutes_per_row = time_required / time_logs.length;
        let current_time = expected_start_date;

        time_logs.forEach((log, index) => {
            let from_time = current_time;
            let to_time = add_minutes_to_datetime(from_time, minutes_per_row);

            frm.add_child('scheduled_time_logs', {
                from_time: from_time,
                to_time: to_time,
                time_in_mins: minutes_per_row
            });

            // La fecha de inicio del siguiente renglón es un segundo después de la fecha to_time del renglón anterior
            current_time = add_seconds_to_datetime(to_time, 1);
        });
    }
}

// Función para manejar la lógica específica de time_logs
function handle_time_logs(frm, expected_start_date, time_required, time_logs) {
    let employees = cur_frm.fields_dict['employee'].value || [];
    let employee = employees.length > 0 ? employees[0].employee : null;
    let total_completed_qty = frm.doc.total_completed_qty;

    if (time_logs.length === 0 || time_logs.length === 1) {
        // Si la tabla está vacía o tiene 1 fila, agregar o sustituir una fila
        let from_time = expected_start_date;
        let to_time = add_minutes_to_datetime(from_time, time_required);

        frm.add_child('time_logs', {
            from_time: from_time,
            to_time: to_time,
            time_in_mins: time_required,
            employee: employee,
            completed_qty: total_completed_qty
        });

        // Establecer los campos del documento principal
        frm.set_value('actual_start_date', from_time);
        frm.set_value('actual_end_date', to_time);
        frm.set_value('total_time_in_mins', time_required);
    } else {
        // Si la tabla tiene n filas, distribuir los minutos requeridos uniformemente
        let minutes_per_row = time_required / time_logs.length;
        let current_time = expected_start_date;

        time_logs.forEach((log, index) => {
            let from_time = current_time;
            let to_time = add_minutes_to_datetime(from_time, minutes_per_row);

            frm.add_child('time_logs', {
                from_time: from_time,
                to_time: to_time,
                time_in_mins: minutes_per_row,
                employee: log.employee || employee,
                completed_qty: index === time_logs.length - 1 ? total_completed_qty : 0
            });

            // La fecha de inicio del siguiente renglón es un segundo después de la fecha to_time del renglón anterior
            current_time = add_seconds_to_datetime(to_time, 1);
        });

        // Establecer los campos del documento principal
        frm.set_value('actual_start_date', expected_start_date);
        frm.set_value('actual_end_date', current_time);
        frm.set_value('total_time_in_mins', time_required);
    }
}

// Función personalizada para agregar minutos a una fecha y hora
function add_minutes_to_datetime(datetime, minutes) {
    return add_seconds_to_datetime(datetime, minutes * 60);
}

// Función personalizada para agregar segundos a una fecha y hora
function add_seconds_to_datetime(datetime, seconds) {
    let date = new Date(datetime);
    date.setSeconds(date.getSeconds() + seconds); // Sumar segundos a la fecha
    return format_datetime(date);
}

// Función para formatear la fecha y hora sin cambiar la zona horaria
function format_datetime(date) {
    let year = date.getFullYear();
    let month = ('0' + (date.getMonth() + 1)).slice(-2);
    let day = ('0' + date.getDate()).slice(-2);
    let hours = ('0' + date.getHours()).slice(-2);
    let minutes = ('0' + date.getMinutes()).slice(-2);
    let seconds = ('0' + date.getSeconds()).slice(-2);
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}