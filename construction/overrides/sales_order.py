import frappe
from erpnext.selling.doctype.sales_order.sales_order import make_sales_invoice

@frappe.whitelist()
def make_progress_invoice(source_name, target_doc=None):
	doclist = make_sales_invoice(source_name, target_doc=target_doc)
	doclist.is_progress_invoice = 1

	sales_orders = list(set(item.sales_order for item in doclist.items))
	already_billed = max(frappe.db.get_value("Sales Order", sales_order, "per_billed") for sales_order in sales_orders)

	doclist.progress_percentage = already_billed

	return doclist