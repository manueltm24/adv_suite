import frappe
from frappe import _
import json

def log_change_in_project(doc, method):
    # Verificar si el documento tiene el campo 'project' o 'custom_project'
    if not (hasattr(doc, 'project') and doc.project) and not (hasattr(doc, 'custom_project') and doc.custom_project):
        return  # Si no hay un proyecto asociado, salir

    # Obtener el proyecto
    project_name = doc.project if hasattr(doc, 'project') and doc.project else doc.custom_project
    project = frappe.get_doc("Project", project_name)
    
    # Manejar la creación del documento
    if method == "after_insert":
        doctype_link = f'<a href="/app/{doc.doctype.lower().replace(" ", "-")}/{doc.name}" target="_blank">{doc.name}</a>'
        activity_message = _("{} {} has been created.").format(_(doc.doctype), doctype_link)
        project.add_comment("Comment", activity_message)
        project.save(ignore_permissions=True)
        return

    # Manejar la cancelación del documento
    if method == "on_cancel":
        doctype_link = f'<a href="/app/{doc.doctype.lower().replace(" ", "-")}/{doc.name}" target="_blank">{doc.name}</a>'
        activity_message = _("{} {} has been cancelled.").format(_(doc.doctype), doctype_link)
        project.add_comment("Comment", activity_message)
        project.save(ignore_permissions=True)
        return

    # Manejar la eliminación del documento
    if method == "on_trash":
        doctype_link = f'<a href="/app/{doc.doctype.lower().replace(" ", "-")}/{doc.name}" target="_blank">{doc.name}</a>'
        activity_message = _("{} {} has been deleted.").format(_(doc.doctype), doctype_link)
        project.add_comment("Comment", activity_message)
        project.save(ignore_permissions=True)
        return

    # Obtener la última versión del documento (si existe)
    version = frappe.get_all(
        "Version",
        filters={"docname": doc.name, "ref_doctype": doc.doctype},
        order_by="creation desc",
        limit_page_length=1
    )
    if not version:
        return  # No hay versiones, probablemente es un nuevo documento o no se ha cambiado nada importante

    # Cargar la versión
    version_doc = frappe.get_doc("Version", version[0].name)

    # Deserializar el campo 'data'
    try:
        version_data = json.loads(version_doc.data)
    except json.JSONDecodeError:
        frappe.log_error(f"Failed to parse version data for {doc.doctype} {doc.name}")
        return  # Salir si hay un error de deserialización

    # Extraer los cambios registrados en la versión
    changes = []
    for change in version_data.get("changed", []):
        fieldname, old_value, new_value = change
        changes.append(f"{fieldname}: {old_value} → {new_value}")

    # Si hay cambios, registrar la actividad en el proyecto
    if changes:
        doctype_link = f'<a href="/app/{doc.doctype.lower().replace(" ", "-")}/{doc.name}" target="_blank">{doc.name}</a>'
        activity_message = _("{} {} has been updated. Changes: {}").format(_(doc.doctype), doctype_link, ", ".join(changes))
        project.add_comment("Comment", activity_message)
        project.save(ignore_permissions=True)  # Guardar cambios en el proyecto