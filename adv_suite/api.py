import frappe
from frappe import _, qb
import json
from erpnext.stock.get_item_details import get_default_bom
from frappe.utils import flt, getdate, nowdate
from erpnext.selling.doctype.quotation.quotation import _make_customer
from frappe.query_builder.functions import Sum
from frappe.model.mapper import get_mapped_doc

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

@frappe.whitelist()
def get_work_order_items(sales_order, for_raw_material_request=0):
	"""Returns items with BOM that already do not have a linked work order"""
	if sales_order:
		so = frappe.get_doc("Sales Order", sales_order)

		wo = qb.DocType("Work Order")

		items = []
		item_codes = [i.item_code for i in so.items]
		product_bundle_parents = [
			pb.new_item_code
			for pb in frappe.get_all(
				"Product Bundle", {"new_item_code": ["in", item_codes], "disabled": 0}, ["new_item_code"]
			)
		]

		for table in [so.items, so.packed_items]:
			for i in table:
				bom = i.bom_no if i.bom_no else get_default_bom(i.item_code)
				stock_qty = i.qty if i.doctype == "Packed Item" else i.stock_qty

				if not for_raw_material_request:
					total_work_order_qty = flt(
						qb.from_(wo)
						.select(Sum(wo.qty))
						.where(
							(wo.production_item == i.item_code)
							& (wo.sales_order == so.name)
							& (wo.sales_order_item == i.name)
							& (wo.docstatus.lt(2))
						)
						.run()[0][0]
					)
					pending_qty = stock_qty - total_work_order_qty
				else:
					pending_qty = stock_qty

				if pending_qty and i.item_code not in product_bundle_parents:
					items.append(
						dict(
							name=i.name,
							item_code=i.item_code,
							description=i.description,
							bom=bom or "",
							warehouse=i.warehouse,
							pending_qty=pending_qty,
							required_qty=pending_qty if for_raw_material_request else 0,
							sales_order_item=i.name,
						)
					)

		return items

@frappe.whitelist()
def make_sales_order(source_name: str, target_doc=None):
	print(f"\n\n\nMaking sales order from {source_name}")
	if not frappe.db.get_singles_value(
		"Selling Settings", "allow_sales_order_creation_for_expired_quotation"
	):
		quotation = frappe.db.get_value(
			"Quotation", source_name, ["transaction_date", "valid_till"], as_dict=1
		)
		if quotation.valid_till and (
			quotation.valid_till < quotation.transaction_date or quotation.valid_till < getdate(nowdate())
		):
			frappe.throw(_("Validity period of this quotation has ended."))

	return _custom_make_sales_order(source_name, target_doc)


def _custom_make_sales_order(source_name, target_doc=None, ignore_permissions=False):
	print(f"\n\n\nMaking sales order from {source_name}")
	customer = _make_customer(source_name, ignore_permissions)
	ordered_items = frappe._dict(
		frappe.db.get_all(
			"Sales Order Item",
			{"prevdoc_docname": source_name, "docstatus": 1},
			["item_code", "sum(qty)"],
			group_by="item_code",
			as_list=1,
		)
	)

	selected_rows = [x.get("name") for x in frappe.flags.get("args", {}).get("selected_items", [])]

	def set_missing_values(source, target):
		if customer:
			target.customer = customer.name
			target.customer_name = customer.customer_name

			# sales team
			if not target.get("sales_team"):
				for d in customer.get("sales_team") or []:
					target.append(
						"sales_team",
						{
							"sales_person": d.sales_person,
							"allocated_percentage": d.allocated_percentage or None,
							"commission_rate": d.commission_rate,
						},
					)

		if source.referral_sales_partner:
			target.sales_partner = source.referral_sales_partner
			target.commission_rate = frappe.get_value(
				"Sales Partner", source.referral_sales_partner, "commission_rate"
			)

		target.flags.ignore_permissions = ignore_permissions
		target.run_method("set_missing_values")
		target.run_method("calculate_taxes_and_totals")

	def update_item(obj, target, source_parent):
		balance_qty = obj.qty - ordered_items.get(obj.item_code, 0.0)
		target.qty = balance_qty if balance_qty > 0 else 0
		target.stock_qty = flt(target.qty) * flt(obj.conversion_factor)
		target.bom_no = obj.custom_bom  # Copiar el campo custom_bom

		if obj.against_blanket_order:
			target.against_blanket_order = obj.against_blanket_order
			target.blanket_order = obj.blanket_order
			target.blanket_order_rate = obj.blanket_order_rate

	def can_map_row(item) -> bool:
		"""
		Row mapping from Quotation to Sales order:
		1. If no selections, map all non-alternative rows (that sum up to the grand total)
		2. If selections: Is Alternative Item/Has Alternative Item: Map if selected and adequate qty
		3. If selections: Simple row: Map if adequate qty
		"""
		has_qty = item.qty > 0

		if not selected_rows:
			return not item.is_alternative

		if selected_rows and (item.is_alternative or item.has_alternative_item):
			return (item.name in selected_rows) and has_qty

		# Simple row
		return has_qty

	doclist = get_mapped_doc(
		"Quotation",
		source_name,
		{
			"Quotation": {"doctype": "Sales Order", "validation": {"docstatus": ["=", 1]}},
			"Quotation Item": {
				"doctype": "Sales Order Item",
				"field_map": {"parent": "prevdoc_docname", "name": "quotation_item"},
				"postprocess": update_item,
				"condition": can_map_row,
			},
			"Sales Taxes and Charges": {"doctype": "Sales Taxes and Charges", "reset_value": True},
			"Sales Team": {"doctype": "Sales Team", "add_if_empty": True},
			"Payment Schedule": {"doctype": "Payment Schedule", "add_if_empty": True},
		},
		target_doc,
		set_missing_values,
		ignore_permissions=ignore_permissions,
	)

	return doclist