import frappe

# Lista de labels para eliminar
def get_labels_to_delete():
    return [
        'Approve Margins',
    ]
def get_link_doctype_to_delete():
    return [
        'BOM Creator',
        'Quotation',
        'Work Order'
    ]

# Función para eliminar registros de doc_links y doc_actions
def delete_doc_links_and_actions():
    labels_to_delete = get_labels_to_delete()
    links_doctype_to_delete = get_link_doctype_to_delete() 

    for label in labels_to_delete:
        frappe.db.delete("DocType Action", {
            "parent": "Project",
            "custom": 1,
            "label": label
        })

    for link_doctype in links_doctype_to_delete:
        frappe.db.delete("DocType Link", {
            "parent": "Project",
            "custom": 1,
            "link_doctype": link_doctype
        })

    frappe.db.commit()
    print("Todos los registros de 'DocType Link' y 'DocType Action' creados por la app han sido eliminados.")


def before_uninstall():
    delete_doc_links_and_actions()
