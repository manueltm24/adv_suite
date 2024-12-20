frappe.ui.form.on('Project', {
    refresh: function(frm) {
        debugger;
        frm.add_custom_button(__('Create Warranty Tasks'), function() {
            frappe.call({
                method: 'adv_suite.api.create_tasks_from_warranty_templates',
                args: {
                    project_name: frm.doc.name
                },
                callback: function(r) {
                    if (r.message) {
                        frappe.msgprint(r.message);
                    }
                }
            });
        });
    }
});
