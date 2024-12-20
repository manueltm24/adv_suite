(() => {
  // ../adv_suite/adv_suite/public/js/job_card/job_card_custom.js
  frappe.ui.form.on("Job Card", {
    onload: function(frm) {
      console.log("onload");
    },
    onload_post_render: function(frm) {
      add_time_icon_to_table(frm, "time_logs");
    }
  });
  function add_time_icon_to_table(frm, table_fieldname) {
    let table_field = frm.fields_dict[table_fieldname];
    if (!table_field) {
      console.error(`No se encontr\xF3 el campo ${table_fieldname}`);
      return;
    }
    let form_column = table_field.$wrapper.closest(".form-column");
    if (!form_column.length) {
      console.error("No se encontr\xF3 el contenedor .form-column");
      return;
    }
    let label_container = table_field.$wrapper.find(".control-label");
    if (!label_container.length) {
      console.error("No se encontr\xF3 el contenedor del label (.control-label)");
      return;
    }
    if (form_column.find(".time-update-icon").length) {
      return;
    }
    label_container.addClass("like-disabled-input");
    label_container.css("position", "relative");
    label_container.css("width", "100%");
    form_column.css("position", "relative");
    form_column.append(`
        <button class="btn icon-btn time-update-icon" style="position: absolute; top: 14px; right: 25px; transform: translateY(-50%);" onmouseover="this.classList.add('btn-default')" onmouseout="this.classList.remove('btn-default')"  title="${__("Set time")}">
            <svg class="es-icon es-line icon-sm" style="filter: opacity(0.55); stroke:none;" aria-hidden="true">
                <use xlink:href="/assets/adv_suite/icons/icons.svg#icon-history"></use>
            </svg>
        </button>
    `);
    form_column.find(".time-update-icon").on("click", function(event2) {
      handle_time_update_click(frm, table_fieldname);
    });
  }
  function handle_time_update_click(frm, table_fieldname) {
    event.stopPropagation();
    let expected_start_date;
    if (table_fieldname === "scheduled_time_logs") {
      expected_start_date = frm.doc.expected_start_date;
    } else if (table_fieldname === "time_logs") {
      expected_start_date = frm.doc.time_logs.length > 0 ? frm.doc.time_logs[0].from_time : frappe.datetime.now_datetime();
    }
    frappe.db.get_doc("BOM", frm.doc.bom_no).then((bom) => {
      let operation = bom.operations.find((op) => op.operation === frm.doc.operation);
      if (!operation) {
        frappe.msgprint(__("No se encontr\xF3 la operaci\xF3n en el BOM."));
        return;
      }
      let time_required = operation.time_in_mins;
      let time_logs = frm.doc[table_fieldname] || [];
      frm.clear_table(table_fieldname);
      if (table_fieldname === "scheduled_time_logs") {
        handle_scheduled_time_logs(frm, expected_start_date, time_required, time_logs);
      } else if (table_fieldname === "time_logs") {
        handle_time_logs(frm, expected_start_date, time_required, time_logs);
      }
      frm.refresh_field(table_fieldname);
      frappe.show_alert({
        message: __("Time successfully adjusted"),
        indicator: "green"
      });
    });
  }
  function handle_scheduled_time_logs(frm, expected_start_date, time_required, time_logs) {
    if (time_logs.length === 0 || time_logs.length === 1) {
      let from_time = expected_start_date;
      let to_time = add_minutes_to_datetime(from_time, time_required);
      frm.add_child("scheduled_time_logs", {
        from_time,
        to_time,
        time_in_mins: time_required
      });
    } else {
      let minutes_per_row = time_required / time_logs.length;
      let current_time = expected_start_date;
      time_logs.forEach((log, index) => {
        let from_time = current_time;
        let to_time = add_minutes_to_datetime(from_time, minutes_per_row);
        frm.add_child("scheduled_time_logs", {
          from_time,
          to_time,
          time_in_mins: minutes_per_row
        });
        current_time = add_seconds_to_datetime(to_time, 1);
      });
    }
  }
  function handle_time_logs(frm, expected_start_date, time_required, time_logs) {
    let employees = cur_frm.fields_dict["employee"].value || [];
    let employee = employees.length > 0 ? employees[0].employee : null;
    let total_completed_qty = frm.doc.total_completed_qty;
    if (time_logs.length === 0 || time_logs.length === 1) {
      let from_time = expected_start_date;
      let to_time = add_minutes_to_datetime(from_time, time_required);
      frm.add_child("time_logs", {
        from_time,
        to_time,
        time_in_mins: time_required,
        employee,
        completed_qty: total_completed_qty
      });
      frm.set_value("actual_start_date", from_time);
      frm.set_value("actual_end_date", to_time);
      frm.set_value("total_time_in_mins", time_required);
    } else {
      let minutes_per_row = time_required / time_logs.length;
      let current_time = expected_start_date;
      time_logs.forEach((log, index) => {
        let from_time = current_time;
        let to_time = add_minutes_to_datetime(from_time, minutes_per_row);
        frm.add_child("time_logs", {
          from_time,
          to_time,
          time_in_mins: minutes_per_row,
          employee: log.employee || employee,
          completed_qty: index === time_logs.length - 1 ? total_completed_qty : 0
        });
        current_time = add_seconds_to_datetime(to_time, 1);
      });
      frm.set_value("actual_start_date", expected_start_date);
      frm.set_value("actual_end_date", current_time);
      frm.set_value("total_time_in_mins", time_required);
    }
  }
  function add_minutes_to_datetime(datetime, minutes) {
    return add_seconds_to_datetime(datetime, minutes * 60);
  }
  function add_seconds_to_datetime(datetime, seconds) {
    let date = new Date(datetime);
    date.setSeconds(date.getSeconds() + seconds);
    return format_datetime(date);
  }
  function format_datetime(date) {
    let year = date.getFullYear();
    let month = ("0" + (date.getMonth() + 1)).slice(-2);
    let day = ("0" + date.getDate()).slice(-2);
    let hours = ("0" + date.getHours()).slice(-2);
    let minutes = ("0" + date.getMinutes()).slice(-2);
    let seconds = ("0" + date.getSeconds()).slice(-2);
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
})();
//# sourceMappingURL=job_card.bundle.6GCZVZUN.js.map
