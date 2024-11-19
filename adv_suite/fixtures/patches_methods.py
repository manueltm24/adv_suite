import frappe

def remove_custom_fields_project():
    print("Eliminando campos obsoletos de Proyectos...")

    if frappe.db.exists("Custom Field", "Project-custom_required_margin"):
        frappe.delete_doc("Custom Field", "Project-custom_required_margin")
        frappe.clear_cache()
        frappe.db.commit() 
        print("Campo 'custom_required_margin' eliminado.")

    print("Se eliminaron los custom fields obsoletos de los Proyectos.")


def remove_and_add_type_of_task():
    print("Eliminando opción 'Proyecto' de Tipo de Tarea...")

    # Eliminar el registro 'Proyecto' si existe
    if frappe.db.exists("Task Type", "Proyecto"):
        try:
            frappe.delete_doc("Task Type", "Proyecto")
            frappe.clear_cache()
            frappe.db.commit()
            print("Registro 'Proyecto' eliminado de Tipo de Tarea.")
        except Exception as e:
            print(f"Error al eliminar el registro 'Proyecto': {str(e)}")
    # Agregar el registro 'Producto' si no existe
    # if not frappe.db.exists("Task Type", "Producto"):
    #     task_type = frappe.get_doc({
    #         "doctype": "Task Type",
    #         "task_type": "Producto"
    #     })
    #     task_type.insert()
    #     frappe.db.commit()
    #     print("Registro 'Producto' agregado a Tipo de Tarea.")

    print("Se actualizaron los registros de Tipo de Tarea.")