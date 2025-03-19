import frappe
from frappe.utils import flt
from erpnext.selling.doctype.sales_order.sales_order import make_sales_invoice

@frappe.whitelist()
def make_progress_invoice(source_name, target_doc=None):
	doclist = make_sales_invoice(source_name, target_doc=target_doc)
	doclist.is_progress_invoice = 1

	doclist.progress_percentage = frappe.flags.args.progress_percentage or 0.0

	project_advancement = 0.0
	if doclist.project:
		project_advancement = flt(frappe.db.get_value("Project", doclist.project, "percent_complete"))

	_items = [i for i in doclist.items if i.so_detail and i.row_type in ["Item", ""]]
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

	doclist.run_method("get_sales_order_details")
	doclist.run_method("calculate_taxes_and_totals")
	doclist.run_method("calculate_progress")

	if doclist.allocate_advances_automatically:
		doclist.run_method("set_advances")

	return doclist


@frappe.whitelist()
def get_progress_percentage(sales_order):
	sales_order = frappe.parse_json(sales_order)

	project_advancement = 0.0
	if sales_order.get("project"):
		project_advancement = flt(frappe.db.get_value("Project", sales_order.get("project"), "percent_complete"))

	per_billed = flt(sales_order.per_billed, 2)
	progress_percentage = max([project_advancement, per_billed])

	if progress_percentage > 99.9:
		progress_percentage = 100.0

	return progress_percentage


def calculate_subtotals(doc, method):
	from construction.construction.print import chantier_prepare_sections

	sections, _ = chantier_prepare_sections(doc, calculate_all_subtotals=True)

	for item in doc.items:
		if row := sections.get(item.name):
			if not row.get("amount"):
				continue

			item.section_total = row.get("amount")

			if method == "on_update_after_submit":
				frappe.db.set_value(item.doctype, item.name, "section_total", row.get("amount"))

