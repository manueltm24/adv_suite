frappe.ui.form.on('BOM', {
    onload_post_render: function(frm) {
        console.log("refresh *");
        // Verificar si el usuario tiene el rol "AUXILIAR ALMACEN"

        if (frappe.user.has_role('AUXILIAR ALMACEN') && !frappe.user.has_role("Administrator")) {
            // Ocultar la línea de tiempo de los comentarios
            if (frm.timeline.wrapper) {
                frm.timeline.wrapper.hide();
            }

            // Ocultar secciones específicas usando Frappe
            frm.toggle_display('bom-section_break_21', false);
            frm.toggle_display('bom-scrap_section', false);
            frm.toggle_display('bom-costing', false);
            $("#bom-section_break_21").hide();
            $("#bom-scrap_section").hide();
            $("#bom-costing").hide();
            $("#bom-more_info_tab").hide();

            $("#bom-section_break_21-tab").hide();
            $("#bom-scrap_section-tab").hide();
            $("#bom-costing-tab").hide();
            $("#bom-more_info_tab-tab").hide();

            cur_frm.fields_dict['items'].grid.wrapper.find('div.d-flex').css({'visibility':'hidden'});
            cur_frm.fields_dict['items'].grid.wrapper.find('.btn-open-row').hide();

            hide_columns(frm);
        
        }
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


function hide_columns(frm) {
    // Ocultar las columnas 'rate', 'amount', 'base_rate', 'base_amount'
    ['rate', 'amount', 'base_rate', 'base_amount'].forEach(fieldname => {
        cur_frm.fields_dict['items'].grid.wrapper.find(`[data-fieldname="${fieldname}"]`).css({'visibility':'hidden'});
        // Eliminar el texto del encabezado de la columna
        cur_frm.fields_dict['items'].grid.wrapper.find(`.grid-static-col[data-fieldname="${fieldname}"] .static-area`).text('');
    });
    cur_frm.fields_dict['items'].grid.wrapper.find('.btn-open-row').hide();
}