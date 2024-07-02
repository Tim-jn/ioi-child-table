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

	if doclist.calculate_progress_globally:
		per_billed = flt(frappe.db.get_value("Sales Order", source_name, "per_billed"), 2)
		doclist.progress_percentage = max([project_advancement, per_billed])

		if doclist.progress_percentage > 99:
			doclist.progress_percentage = 100.0

	_items = [i for i in doclist.items if (not i.so_detail or i.row_type not in ["Item", ""])]
	for item in _items:
		base_net_amount, billed_amt = frappe.db.get_value("Sales Order Item", item.so_detail, ["base_net_amount", "billed_amt"])
		if base_net_amount:
			already_billed = flt(billed_amt) / flt(base_net_amount) * 100.0
			qty_to_bill = frappe.db.get_value("Sales Order Item", item.so_detail, "qty")
			item.progress_percentage = max([project_advancement, already_billed, doclist.progress_percentage])
			item.qty = (flt(item.progress_percentage) - flt(already_billed)) / 100.0 * flt(qty_to_bill)

	for item in _items:
		if item.progress_percentage > doclist.progress_percentage:
			doclist.calculate_progress_globally = False
			break

	doclist.advances = []
	doclist.run_method("calculate_progress")
	doclist.run_method("calculate_taxes_and_totals")

	if doclist.allocate_advances_automatically:
		doclist.run_method("set_advances")

	return doclist