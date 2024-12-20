(() => {
  // ../adv_suite/adv_suite/public/js/bom/bom_custom.js
  frappe.ui.form.on("BOM", {
    onload: function(frm) {
      calculate_margin_values(frm);
    },
    onload_post_render: function(frm) {
      if (frappe.user.has_role("AUXILIAR ALMACEN") && !frappe.user.has_role("Administrator")) {
        console.log("Aplicando personalizaciones basadas en roles para el formulario BOM");
        if (frm.timeline.wrapper) {
          frm.timeline.wrapper.hide();
        }
        apply_role_based_customizations(frm, "items");
      }
      frappe.call({
        method: "frappe.client.get_value",
        args: {
          doctype: "Advertech Settings",
          fieldname: ["bom_items_separator"]
        },
        callback: function(r) {
          if (r.message) {
            frm.bom_items_separator = r.message.bom_items_separator || "|";
          }
        }
      });
      add_copy_icon_to_table(frm);
      $(frm.fields_dict.custom_bom_description.wrapper).find("textarea").css("height", "75px");
    },
    custom_margin_type: function(frm) {
      reset_margin_fields(frm);
      toggle_margin_fields(frm);
      calculate_margin_values(frm);
    },
    custom_margin_rate_or_amount: function(frm) {
      calculate_margin_values(frm);
    },
    custom_margin_amount: function(frm) {
      calculate_margin_values(frm);
    },
    total_cost: function(frm) {
      calculate_margin_values(frm);
    },
    custom_total_to_quote: function(frm) {
      calculate_margin_values(frm);
    },
    items_on_form_rendered(doc, doctype, docname) {
    },
    before_submit: function(frm) {
      if (!frm.doc.custom_warehouse_verified_materials) {
        frappe.msgprint(__("Es requerido confirmar que se ha realizado la verificaci\xF3n por Almac\xE9n de la disponibilidad de materiales."));
        frappe.validated = false;
      }
    }
  });
  function calculate_margin_values(frm) {
    let margin_type = frm.doc.custom_margin_type || "Percentage";
    frm.set_value("custom_margin_type", margin_type);
    let margin_rate_or_amount = frm.doc.custom_margin_rate_or_amount || 0;
    let effective_item_rate = frm.doc.total_cost || 0;
    if (margin_type == "Percentage") {
      let margin_rate_or_amount2 = frm.doc.custom_margin_rate_or_amount || 0;
      let margin_amount = flt(effective_item_rate) * (flt(margin_rate_or_amount2) / 100);
      frm.set_value("custom_margin_amount", margin_amount);
      frm.set_value("custom_rate_with_margin", flt(effective_item_rate) + margin_amount);
    } else if (margin_type == "Amount") {
      let margin_amount = frm.doc.custom_margin_amount || 0;
      effective_item_rate = flt(effective_item_rate);
      margin_amount = flt(margin_amount);
      let margin_rate_or_amount2 = 0;
      if (effective_item_rate > 0) {
        margin_rate_or_amount2 = margin_amount / effective_item_rate * 100;
      }
      frm.set_value("custom_margin_rate_or_amount", margin_rate_or_amount2);
      frm.set_value("custom_rate_with_margin", flt(effective_item_rate) + flt(margin_amount));
    } else if (margin_type == "Total to Quote") {
      let custom_total_to_quote = frm.doc.custom_total_to_quote || effective_item_rate;
      let margin_amount = custom_total_to_quote - effective_item_rate;
      let margin_rate_or_amount2 = 0;
      if (effective_item_rate > 0) {
        margin_rate_or_amount2 = margin_amount / effective_item_rate * 100;
      }
      frm.set_value("custom_margin_rate_or_amount", margin_rate_or_amount2);
      frm.set_value("custom_margin_amount", margin_amount);
      frm.set_value("custom_rate_with_margin", custom_total_to_quote);
    } else {
      console.log("No se ha seleccionado un tipo de margen");
      frm.set_value("custom_rate_with_margin", effective_item_rate);
    }
    if (!margin_type) {
      toggle_margin_fields(frm);
    } else {
      if (margin_type == "Percentage") {
        frm.toggle_display("custom_margin_rate_or_amount", true);
        frm.toggle_display("custom_total_to_quote", false);
        if (frm.doc.custom_margin_rate_or_amount == 0) {
          frm.toggle_display("custom_margin_amount", false);
        } else {
          frm.toggle_display("custom_margin_amount", true);
          frm.set_df_property("custom_margin_amount", "read_only", 1);
        }
        frm.toggle_display("custom_rate_with_margin", true);
      } else if (margin_type == "Amount") {
        frm.toggle_display("custom_margin_amount", true);
        frm.toggle_display("custom_total_to_quote", false);
        if (frm.doc.custom_margin_amount == 0) {
          frm.toggle_display("custom_margin_rate_or_amount", false);
        } else {
          frm.toggle_display("custom_margin_rate_or_amount", true);
          frm.set_df_property("custom_margin_rate_or_amount", "read_only", 1);
        }
        frm.toggle_display("custom_rate_with_margin", true);
      } else if (margin_type == "Total to Quote") {
        frm.toggle_display("custom_total_to_quote", true);
        frm.toggle_display("custom_margin_rate_or_amount", false);
        frm.toggle_display("custom_margin_amount", false);
        frm.toggle_display("custom_rate_with_margin", false);
        if (frm.doc.custom_margin_amount == 0) {
          frm.toggle_display("custom_margin_rate_or_amount", false);
        } else {
          frm.toggle_display("custom_margin_rate_or_amount", true);
          frm.set_df_property("custom_margin_rate_or_amount", "read_only", 1);
        }
        if (frm.doc.custom_margin_rate_or_amount == 0) {
          frm.toggle_display("custom_margin_amount", false);
        } else {
          frm.toggle_display("custom_margin_amount", true);
          frm.set_df_property("custom_margin_amount", "read_only", 1);
        }
      }
    }
  }
  function reset_margin_fields(frm) {
    frm.set_value("custom_margin_rate_or_amount", 0);
    frm.set_value("custom_margin_amount", 0);
    frm.set_value("custom_total_to_quote", 0);
    frm.set_df_property("custom_margin_rate_or_amount", "read_only", 0);
    frm.set_df_property("custom_margin_amount", "read_only", 0);
  }
  function toggle_margin_fields(frm) {
    frm.toggle_display("custom_margin_rate_or_amount", false);
    frm.toggle_display("custom_margin_amount", false);
    frm.toggle_display("custom_total_to_quote", false);
  }
  frappe.ui.form.on("BOM Item", {
    form_render: function(frm, cdt, cdn) {
      if (frappe.user.has_role("AUXILIAR ALMACEN") && !frappe.user.has_role("Administrator")) {
        let item = locals[cdt][cdn];
        let columns_to_hide = ["rate", "amount", "base_rate", "base_amount"];
        columns_to_hide.forEach((column) => {
          frm.fields_dict["items"].grid.toggle_display(column, false, item.name);
        });
        let grid_row = frm.fields_dict["items"].grid.grid_rows_by_docname[cdn];
        let row_element = grid_row.wrapper[0];
        let observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(mutation) {
            if (mutation.attributeName === "class") {
              if (!row_element.classList.contains("grid-row-open")) {
                apply_role_based_customizations(frm, "items");
              }
            }
          });
        });
        observer.observe(row_element, { attributes: true });
      }
    }
  });
  function hide_columns(frm, fields2, table) {
    let grid = frm.get_field(table).grid;
    for (let field of fields2) {
      grid.fields_map[field].hidden = 1;
    }
    grid.visible_columns = void 0;
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
        if (row.columns[field] !== void 0) {
          row.columns[field].remove();
        }
      }
      delete row.columns;
      row.columns = [];
      row.render_row();
    }
  }
  function hide_tabs(frm, fields2, dn) {
    prefix = dn.toLowerCase().replace(/ /g, "_");
    fields2.forEach((fieldname) => {
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
    setTimeout(function() {
      let grid = frm.get_field(table).grid;
      grid.grid_rows.forEach((row) => {
        row.row_check[0].hidden = 1;
      });
      grid.header_row.row_check[0].hidden = 1;
    }, 50);
  }
  function hide_last_column(frm, table) {
    setTimeout(function() {
      let grid = frm.get_field(table).grid;
      grid.grid_rows.forEach((row) => {
        row.open_form_button[0].parentElement.remove();
      });
      let header_columns = grid.wrapper[0].querySelectorAll(".grid-static-col.d-flex.justify-content-center");
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
    tabs_links = ["section_break_21", "scrap_section", "costing", "more_info_tab"];
    hide_tabs(frm, tabs_links, frm.doctype);
  }
  function apply_table_role_based_customizations(frm, table) {
    fields = ["rate", "amount", "base_rate", "base_amount"];
    hide_columns(frm, fields, table);
    hide_row_check(frm, table);
    hide_last_column(frm, table);
  }
  function add_copy_icon_to_table(frm) {
    let table_field = frm.fields_dict["items"];
    if (!table_field) {
      console.error("No se encontr\xF3 el campo custom_project_materials");
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
    if (label_container.find(".copy-content-icon").length) {
      return;
    }
    label_container.addClass("like-disabled-input");
    label_container.css("position", "relative");
    label_container.css("width", "100%");
    form_column.css("position", "relative");
    form_column.append(`
        <button class="btn icon-btn copy-content-icon" style="position: absolute; top: 14px; right: 25px; transform: translateY(-50%);" onmouseover="this.classList.add('btn-default')" onmouseout="this.classList.remove('btn-default')"  title="${__("Set time")}">
            <svg class="es-icon es-line icon-sm" style="filter: opacity(0.55); stroke:none;" aria-hidden="true">
                 <use class="" href="#es-line-copy-light"></use>
            </svg>
        </button>
    `);
    form_column.find(".copy-content-icon").on("click", function() {
      let selected_items = frm.doc.items || [];
      let separator = frm.bom_items_separator || "|";
      separator = separator.replace(/\\n/g, "\n");
      let concatenated_values = selected_items.map((item) => item.item_name).join(separator);
      copy_to_clipboard(concatenated_values);
      frappe.show_alert({
        message: __("Copied to clipboard"),
        indicator: "green"
      });
    });
  }
  function copy_to_clipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
  }
})();
//# sourceMappingURL=bom.bundle.CR74FDUC.js.map
