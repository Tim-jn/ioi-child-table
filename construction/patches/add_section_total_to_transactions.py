import frappe

from construction.construction.print import chantier_prepare_sections
from construction.install import add_custom_fields

def execute():
	add_custom_fields()

	for dt in ["Quotation", "Sales Order", "Sales Invoice", "Delivery Note"]:
		for parent in set(frappe.get_all(f"{dt} Item", filters={"row_type": ("in", ["title1", "title2", "title3"])}, pluck="parent")):
			doc = frappe.get_doc(dt, parent)
			sections = chantier_prepare_sections(doc, True)
			for item in doc.items:
				if item.name in sections[0] and (amount := sections[0][item.name]["amount"]):
					frappe.db.set_value(f"{dt} Item", item.name, "section_total", amount, update_modified=False)