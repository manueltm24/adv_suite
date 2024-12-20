(() => {
  // ../adv_suite/adv_suite/public/js/quotation/quotation_custom.js
  frappe.ui.form.on("Quotation", {
    onload: function(frm) {
      frm.fields_dict["items"].grid.get_field("custom_bom").get_query = function(doc, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row && row.item_code) {
          return {
            filters: [
              ["BOM", "item", "=", row.item_code]
            ]
          };
        }
      };
      if (frm.is_new()) {
        frappe.db.get_single_value("Advertech Settings", "default_validity_period_for_the_quotation").then((default_validity_period) => {
          if (default_validity_period) {
            let valid_till_date = frappe.datetime.add_days(frappe.datetime.nowdate(), default_validity_period);
            frm.set_value("valid_till", valid_till_date);
          }
        });
      }
    },
    onload_post_render: function(frm) {
      $(frm.fields_dict.custom_notes.wrapper).find("textarea").css("height", "75px");
    },
    custom_project: function(frm) {
      if (frm.doc.custom_project) {
        frappe.db.get_doc("Project", frm.doc.custom_project).then((project) => {
          if (project.customer) {
            frm.set_value("party_name", project.customer);
          }
        });
      }
    },
    party_name: function(frm) {
      setTimeout(() => {
        frm.doc.items.forEach((item) => {
          custom_bom(frm, item.doctype, item.name);
        });
      }, 100);
    },
    before_save: function(frm) {
      console.log("before_save");
      validate_rate_with_margin(frm);
    },
    refresh: function(frm) {
      add_recalculate_button(frm);
      if (frappe.user.has_role("AUXILIAR ALMACEN") && !frappe.user.has_role("Administrator")) {
        frm.doc.items.forEach((item) => {
          frappe.model.set_value(item.doctype, item.name, "rate", 0);
          frappe.model.set_value(item.doctype, item.name, "amount", 0);
        });
        frm.refresh_field("items");
        frm.refresh_fields(["total", "grand_total", "rounded_total"]);
        frm.toggle_display("other_charges_calculation", false);
        frm.toggle_display("payment_schedule", false);
      }
    },
    before_submit: function(frm) {
      if (!frm.doc.custom_accounting_verified_credit) {
        frappe.msgprint(__("Es requerido confirmar que se ha realizado la verificaci\xF3n por Contabilidad del cr\xE9dito y anticipo."));
        frappe.validated = false;
      }
      validate_warehouse_verification(frm);
    }
  });
  frappe.ui.form.on("Quotation Item", {
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
        frappe.msgprint(__("Por favor seleccione un cliente primero."));
        frappe.model.set_value(cdt, cdn, "item_code", "");
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
      setTimeout(() => {
        custom_bom(frm, cdt, cdn).then(() => {
          console.log("Precio actualizado desde custom_bom");
        });
      }, 0);
    }
  });
  function apply_bom_filter(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    if (row.item_code) {
      frm.fields_dict["items"].grid.get_field("custom_bom").get_query = function(doc, cdt2, cdn2) {
        let current_row = locals[cdt2][cdn2];
        return {
          filters: [
            ["BOM", "item", "=", current_row.item_code]
          ]
        };
      };
      frm.refresh_field("items");
    }
  }
  function recalculate_prices(frm) {
    if (frm.doc.items && frm.doc.items.length > 0) {
      frm.doc.items.forEach((item) => {
        if (item.custom_bom) {
          custom_bom(frm, item.doctype, item.name);
        }
      });
    }
  }
  function custom_bom(frm, cdt, cdn) {
    return new Promise((resolve, reject) => {
      let item = locals[cdt][cdn];
      if (item.custom_bom) {
        frappe.db.get_doc("BOM", item.custom_bom).then((bom) => {
          let total_cost = bom.total_cost || 0;
          let custom_margin_type = bom.custom_margin_type || "";
          let custom_margin_rate_or_amount = bom.custom_margin_rate_or_amount || 0;
          let custom_rate_with_margin = bom.custom_rate_with_margin || 0;
          let custom_margin_amount = bom.custom_margin_amount || 0;
          let bom_quantity = bom.quantity || 1;
          let unit_cost = total_cost / bom_quantity;
          let unit_margin_amount = custom_margin_amount / bom_quantity;
          let rate_with_margin = unit_cost + unit_margin_amount;
          unit_cost = flt(unit_cost);
          unit_margin_amount = flt(unit_margin_amount);
          rate_with_margin = unit_cost + unit_margin_amount;
          if (custom_margin_type !== "Amount") {
            custom_margin_type = "Amount";
          }
          frappe.model.set_value(cdt, cdn, "custom_total_cost_of_bom", unit_cost).then(() => frappe.model.set_value(cdt, cdn, "price_list_rate", unit_cost)).then(() => frappe.model.set_value(cdt, cdn, "base_price_list_rate", unit_cost)).then(() => frappe.model.set_value(cdt, cdn, "rate", unit_cost)).then(() => frappe.model.set_value(cdt, cdn, "margin_type", custom_margin_type)).then(() => frappe.model.set_value(cdt, cdn, "margin_rate_or_amount", unit_margin_amount)).then(() => frappe.model.set_value(cdt, cdn, "rate_with_margin", rate_with_margin)).then(() => {
            frm.refresh_field("items");
            resolve();
          });
        }).catch((err) => {
          console.error("Error al recuperar el BOM:", err);
          reject(err);
        });
      } else {
        resolve();
      }
    });
  }
  function add_recalculate_button(frm) {
    if (!frappe.user.has_role("AUXILIAR ALMACEN") || frappe.user.has_role("Administrator")) {
      let has_custom_bom = frm.doc.items.some((item) => item.custom_bom);
      let button = frm.fields_dict.items.grid.wrapper.find(".grid-buttons .btn:has(i.fa-refresh)");
      if (!button.length) {
        button = $('<button class="btn btn-info btn-xs btn btn-xs btn-secondary grid-add-row-1"><i class="fa fa-refresh"></i> BOM</button>').click(function() {
          recalculate_prices(frm);
        }).appendTo(frm.fields_dict.items.grid.wrapper.find(".grid-buttons"));
      }
      if (has_custom_bom) {
        button.show();
      } else {
        button.hide();
      }
    }
  }
  async function validate_rate_with_margin(frm) {
    for (let item of frm.doc.items) {
      if (item.custom_bom) {
        let bom = await frappe.db.get_doc("BOM", item.custom_bom);
        let delta = 0.05;
        console.log("BOM custom_rate_with_margin:", bom.custom_rate_with_margin, "Item rate:", item.rate * item.qty);
        console.log("Diferencia:", Math.abs(bom.custom_rate_with_margin - item.rate * item.qty));
        if (Math.abs(bom.custom_rate_with_margin - item.rate * item.qty) > delta) {
          console.log("BOM custom_rate_with_margin:", bom.custom_rate_with_margin, "Item rate:", item.rate);
          frappe.validated = false;
          frappe.throw(__("El precio del producto o la cantidad no coincide con el costo a cotizar del BOM, use el bot\xF3n actualizar BOM, debajo de la tabla, para actualizar el precio."));
        }
      }
    }
  }
  async function validate_warehouse_verification(frm) {
    for (let item of frm.doc.items) {
      if (item.custom_bom) {
        let bom = await frappe.db.get_doc("BOM", item.custom_bom);
        if (bom.docstatus === 2) {
          frappe.validated = false;
          let bom_link = `<a href="/app/bom/${item.custom_bom}" target="_blank">${item.custom_bom}</a>`;
          frappe.throw(__("El BOM ha sido cancelado: " + bom_link));
        } else if (bom.docstatus !== 1) {
          frappe.validated = false;
          let bom_link = `<a href="/app/bom/${item.custom_bom}" target="_blank">${item.custom_bom}</a>`;
          frappe.throw(__("No se ha realizado la validaci\xF3n por almac\xE9n del BOM: " + bom_link));
        }
      }
    }
  }
})();
//# sourceMappingURL=quotation.bundle.JD2FE43Y.js.map
