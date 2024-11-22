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


def create_custom_docperms():
    custom_docperms = [
        {
            "parent": "Task Type",
            "role": "All",
            "permlevel": 0,
            "read": 1,
            "write": 1,
            "create": 1,
            "delete": 1,
            "submit": 0,
            "cancel": 0,
            "amend": 0,
            "email": 1,
            "print": 1,
            "export": 1,
            "import": 1,
            "report": 1,
            "share": 1,
            "select": 1,
            "if_owner": 0,
        },
        {
            "parent": "Product Finish",
            "role": "All",
            "permlevel": 0,
            "read": 1,
            "write": 1,
            "create": 1,
            "delete": 1,
            "submit": 0,
            "cancel": 0,
            "amend": 0,
            "email": 1,
            "print": 1,
            "export": 1,
            "import": 1,
            "report": 1,
            "share": 1,
            "select": 1,
            "if_owner": 0,
        },
        {
            "parent": "Item",
            "role": "All",
            "permlevel": 0,
            "read": 1,
            "write": 0,
            "create": 0,
            "delete": 0,
            "submit": 0,
            "cancel": 0,
            "amend": 0,
            "email": 0,
            "print": 0,
            "export": 0,
            "import": 0,
            "report": 0,
            "share": 0,
            "select": 0,
            "if_owner": 0,
        },
        {
            "parent": "Employee",
            "role": "All",
            "permlevel": 0,
            "read": 1,
            "write": 0,
            "create": 0,
            "delete": 0,
            "submit": 0,
            "cancel": 0,
            "amend": 0,
            "email": 0,
            "print": 0,
            "export": 0,
            "import": 0,
            "report": 0,
            "share": 0,
            "select": 0,
            "if_owner": 0,
        },
    ]

    for perm in custom_docperms:
        # Verificar si ya existe el permiso
        existing_perm = frappe.get_all(
            "Custom DocPerm",
            filters={
                "parent": perm["parent"],
                "role": perm["role"],
                "permlevel": perm["permlevel"],
            },
        )
        if not existing_perm:
            # Crear el nuevo permiso
            docperm = frappe.get_doc({"doctype": "Custom DocPerm", **perm})
            docperm.insert()
            frappe.db.commit()
            print(f"Custom DocPerm creado para {perm['parent']} con role {perm['role']}.")
        else:
            print(f"Custom DocPerm ya existe para {perm['parent']} con role {perm['role']}.")
