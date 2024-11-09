import frappe
from frappe import _
import json

@frappe.whitelist()
def aprove_margin():
    try:
        print("\n\n\nAprove margin")
        # Validar que 'doc' esté presente en frappe.form_dict
        if 'doc' not in frappe.form_dict:
            frappe.throw(_("Missing 'doc' in request"))

        # Cargar el documento desde el JSON
        doc = json.loads(frappe.form_dict.doc)

        # Validar que el documento tenga un campo 'name'
        if 'name' not in doc:
            frappe.throw(_("Missing 'name' in document"))

        project_name = doc["name"]

        # Recuperar el proyecto
        project = frappe.get_doc("Project", project_name)

        # Verificar si el campo 'custom_required_margin' está definido en el proyecto
        if not hasattr(project, 'custom_required_margin') or project.custom_required_margin is None:
            frappe.throw(_("The project does not have a defined custom margin"))

        # Recuperar todas las cotizaciones asociadas al proyecto
        quotations = frappe.get_all("Quotation", filters={"custom_project": project_name}, fields=["name"])

        # Verificar si hay cotizaciones asociadas al proyecto
        if not quotations:
            frappe.msgprint(_("No quotations associated with project {0}").format(project_name))
            return

        for quotation in quotations:
            quotation_doc = frappe.get_doc("Quotation", quotation.name)
            print(quotation.name)
            for item in quotation_doc.items:
                print(item.item_code)
                # Verificar si el campo 'custom_bom' está presente en el ítem
                if hasattr(item, 'custom_bom') and item.custom_bom:
                    print(f"\n\n\nUpdating item {item.item_code} in quotation {quotation.name}")
                    # Obtener el costo basado en el BOM

                    bom_cost = get_bom_cost(item.custom_bom)

                    # Calcular el nuevo precio basado en el margen 
                    custom_margin = project.custom_required_margin / 100
                    new_price = bom_cost * (1 + custom_margin)
                    
                    # Actualizar el precio del producto
                    item.rate = new_price
                    item.amount = new_price * item.qty
            
            # Guardar la cotización actualizada
            quotation_doc.save()

        # Mostrar un mensaje de éxito
        frappe.msgprint(_("Quotations associated with project {0} have been updated").format(project_name))

    except Exception as e:
        # Manejar excepciones y registrar el error
        frappe.log_error(message=str(e), title=_("Error in aprove_margin"))
        frappe.throw(_("An error occurred while updating the quotations: {0}").format(str(e)))

def get_bom_cost(bom_name):
    """Obtener el costo total del BOM."""
    bom = frappe.get_doc("BOM", bom_name)
    return bom.total_cost

@frappe.whitelist()
def update_bom(bom_name, margin_type, margin_rate_or_amount, margin_amount, rate_with_margin):
    try:
        frappe.logger().info(f"Updating BOM: {bom_name}, Margin Type: {margin_type}, Margin Rate or Amount: {margin_rate_or_amount}")
        bom = frappe.get_doc('BOM', bom_name)
        bom.custom_margin_type = margin_type
        bom.custom_margin_rate_or_amount = margin_rate_or_amount
        bom.custom_margin_amount = margin_amount
        bom.custom_rate_with_margin = rate_with_margin
        bom.save()
        frappe.db.commit()
        frappe.logger().info(f"BOM {bom_name} updated successfully")
    except Exception as e:
        frappe.logger().error(f"Error updating BOM {bom_name}: {str(e)}")
        frappe.throw(_("An error occurred while updating the BOM: {0}").format(str(e)))


@frappe.whitelist()
def search_items(query, limit=5):
    print(f"Searching items with query: {query}")
    print(query)
    items = frappe.get_all('Item', filters={'item_name': ['like', f'%{query}%']}, fields=['item_name'], limit=limit)
    print(f"Items found: {items}")
    return items