import frappe
from frappe.utils import flt
from erpnext.selling.doctype.sales_order.sales_order import make_sales_invoice

@frappe.whitelist()
def make_progress_invoice(source_name, target_doc=None):
	doclist = make_sales_invoice(source_name, target_doc=target_doc)
	doclist.is_progress_invoice = 1

	project_advancement = 0.0
	if doclist.project:
		project_advancement = flt(frappe.db.get_value("Project", doclist.project, "percent_complete"))

	for item in doclist.items:
		if not item.so_detail or item.row_type not in ["Item", ""]:
			continue

		base_net_amount, billed_amt = frappe.db.get_value("Sales Order Item", item.so_detail, ["base_net_amount", "billed_amt"])
		already_billed = flt(billed_amt) / flt(base_net_amount) * 100.0
		qty_to_bill = frappe.db.get_value("Sales Order Item", item.so_detail, "qty")
		item.progress_percentage = max([project_advancement, already_billed])
		item.qty = (flt(item.progress_percentage) - flt(already_billed)) / 100.0 * flt(qty_to_bill)

	doclist.run_method("calculate_progress")
	doclist.run_method("calculate_taxes_and_totals")

	return doclist