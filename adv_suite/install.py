import frappe

# Función para insertar los valores de doc_links en el DocType Link
def insert_doc_links(doc_links):
    if not doc_links:
        print("No hay datos en doc_links para insertar.")
        return

    for link_data in doc_links:
        doc = frappe.get_doc({
            "doctype": "DocType Link",
            **link_data
        })
        doc.insert(ignore_permissions=True)

    frappe.db.commit()
    print("Todos los registros han sido insertados en 'DocType Link'.")

# Función para insertar los valores de doc_actions en el DocType Action
def insert_doc_actions(doc_actions):
    if not doc_actions:
        print("No hay datos en doc_actions para insertar.")
        return

    for action_data in doc_actions:
        doc = frappe.get_doc({
            "doctype": "DocType Action",
            **action_data
        })
        doc.insert(ignore_permissions=True)

    frappe.db.commit()
    print("Todos los registros han sido insertados en 'DocType Action'.")

# Función principal para insertar registros de doc_links y doc_actions
def insert_doc_links_and_actions():
    doc_links = [
        {
            'parent': 'Project',
            'parentfield': 'links',
            'parenttype': 'Customize Form',
            'idx': 2,
            'group': 'Material',
            'link_doctype': 'BOM Creator',
            'link_fieldname': 'project',
            'parent_doctype': None,
            'table_fieldname': None,
            'hidden': 0,
            'is_child_table': 0,
            'custom': 1
        },
        {
            'parent': 'Project',
            'parentfield': 'links',
            'parenttype': 'Customize Form',
            'idx': 1,
            'group': 'Manufacturing',
            'link_doctype': 'Work Order',
            'link_fieldname': 'project',
            'parent_doctype': None,
            'table_fieldname': None,
            'hidden': 0,
            'is_child_table': 0,
            'custom': 1
        },
        {
            'parent': 'Project',
            'parentfield': 'links',
            'parenttype': 'Customize Form',
            'idx': 0,
            'group': 'Sales',
            'link_doctype': 'Quotation',
            'link_fieldname': 'custom_project',
            'parent_doctype': None,
            'table_fieldname': None,
            'hidden': 0,
            'is_child_table': 0,
            'custom': 1
        }
    ]
    
    doc_actions = [
        {
            'parent': 'Project',
            'parentfield': 'actions',
            'parenttype': 'Customize Form',
            'idx': 0,
            'label': 'Approve Margins',
            'group': None,
            'action_type': 'Server Action',
            'action': 'adv_suite.api.aprove_margin',
            'hidden': 0,
            'custom': 1
        }
    ]

    insert_doc_links(doc_links)
    insert_doc_actions(doc_actions)
 
def after_install():
    insert_doc_links_and_actions()