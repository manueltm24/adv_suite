frappe.ui.form.on('BOM', {
    load: function(frm) {
        console.log("load");
    },
    custom_margin_type: function(frm) {
        console.log("custom_margin_type");
        if (!frm.doc.custom_margin_type) {
            // Si la opción seleccionada es vacía, establecer los otros campos a cero
            frm.set_value('custom_margin_rate_or_amount', 0);
            frm.set_value('custom_rate_with_margin', 0);
        } else {
            // Calcular custom_rate_with_margin basado en custom_margin_type
            let effective_item_rate = frm.doc.total_cost || 0;
            let margin_rate_or_amount = frm.doc.custom_margin_rate_or_amount || 0;

            if (frm.doc.custom_margin_type == "Percentage") {
                frm.set_value('custom_rate_with_margin', flt(effective_item_rate) + flt(effective_item_rate) * (flt(margin_rate_or_amount) / 100));
            } else {
                frm.set_value('custom_rate_with_margin', flt(effective_item_rate) + flt(margin_rate_or_amount));
            }
        }
    },
    custom_margin_rate_or_amount: function(frm) {
        // Recalcular custom_rate_with_margin cuando custom_margin_rate_or_amount cambie
        console.log("custom_margin_rate_or_amount");
        if (frm.doc.custom_margin_type) {
            let effective_item_rate = frm.doc.total_cost || 0;
            let margin_rate_or_amount = frm.doc.custom_margin_rate_or_amount || 0;

            if (frm.doc.custom_margin_type == "Percentage") {
                frm.set_value('custom_rate_with_margin', flt(effective_item_rate) + flt(effective_item_rate) * (flt(margin_rate_or_amount) / 100));
            } else {
                frm.set_value('custom_rate_with_margin', flt(effective_item_rate) + flt(margin_rate_or_amount));
            }
        }
    }
});