import frappe

def remove_custom_fields_project():
    print("Eliminando campos obsoletos de Proyectos...")

    if frappe.db.exists("Custom Field", "Project-custom_required_margin"):
        frappe.delete_doc("Custom Field", "Project-custom_required_margin")
        print("Campo 'custom_required_margin' eliminado.")

    print("Se eliminaron los custom fields obsoletos de los Proyectos.")