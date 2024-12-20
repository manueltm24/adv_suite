frappe.ui.form.on('ToDo', {
    after_save: function(frm) {
        if (frm.doc.reference_type === "Task" && frm.doc.reference_name) {
            frappe.call({
                method: "frappe.client.set_value",
                args: {
                    doctype: "Task",
                    name: frm.doc.reference_name,
                    fieldname: "custom_last_assignment_date",
                    value: frm.doc.creation
                },
                callback: function(response) {
                    if (!response.exc) {
                        frappe.msgprint(__('Last Assignment Date updated successfully for Task: {0}', [frm.doc.reference_name]));
                    }
                }
            });
        }
    }
});
