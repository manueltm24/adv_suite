frappe.ui.form.on('Task', {
    load: function(frm) {
        console.log("load task");
    },
    onload_post_render: function (frm) {
        frm.get_field("custom_project_materials").grid.set_multiple_add("item_code");
    }
});

// Controladores de eventos para la tabla custom_project_materials
frappe.ui.form.on('Project Materials', {
    item_code: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.item_code) {
            frappe.db.get_value('Item', row.item_code, 'item_name', (r) => {
                if (r && r.item_name) {
                    frappe.model.set_value(cdt, cdn, 'item_name', r.item_name);
                }
            });
        }
    },
    item_name: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.item_name) {
            frappe.db.get_value('Item', row.item_name, 'item_code', (r) => {
                if (r && r.item_code) {
                    frappe.model.set_value(cdt, cdn, 'item_code', r.item_code);
                }
            });
        }
    }
});