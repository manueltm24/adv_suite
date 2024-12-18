import frappe
from frappe.utils import now

def update_custom_last_assignment_date(doc, method):
    if doc.reference_type == "Task" and doc.reference_name:
        # Usar una bandera para evitar la recursión
        if not frappe.flags.in_update_custom_last_assignment_date:
            frappe.flags.in_update_custom_last_assignment_date = True
            
            try:
                # Actualizar el campo custom_last_assignment_date en el Doctype Task
                frappe.db.set_value("Task", doc.reference_name, "custom_last_assignment_date", now())
                
                # Obtener el documento de la tarea y guardarlo para forzar la actualización
                task = frappe.get_doc("Task", doc.reference_name)
                task.save()
                
                frappe.msgprint(f"Last Assignment Date updated successfully for Task: {doc.reference_name}")
            finally:
                # Restablecer la bandera
                frappe.flags.in_update_custom_last_assignment_date = False