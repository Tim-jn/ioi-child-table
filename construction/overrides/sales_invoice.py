import frappe
from frappe import _
from frappe.utils import flt

from erpnext.accounts.doctype.sales_invoice.sales_invoice import SalesInvoice
from erpnext.controllers.accounts_controller import validate_account_head

from construction.overrides.status_updater import add_row_type_condition_to_status_updater
from construction.construction.doctype.progress_invoicing_items.progress_invoicing_items import set_invoicing_summary

class ConstructionSalesInvoice(SalesInvoice):
	def __init__(self, *args, **kwargs):
		super().__init__(*args, **kwargs)
		self.status_updater = add_row_type_condition_to_status_updater(self.status_updater)

	def validate_income_account(self):
		for item in self.get("items"):
			if item.row_type not in ["", "item"]:
				continue

			validate_account_head(
				item.idx, item.income_account, self.company, _("Income", context="Account Validation")
			)

	def validate_uom_is_integer(self, uom_field, qty_fields):
		if not self.is_progress_invoice:
			super(ConstructionSalesInvoice, self).validate_uom_is_integer(uom_field, qty_fields)

	def validate(self):
		super().validate()
		self.calculate_progress()

	def calculate_progress(self):
		if not self.is_progress_invoice:
			return

		items = [item for item in self.items if item.row_type in ("Item", "")]

		total_billed = 0.0
		for item in items:
			base_net_amount, qty, billed_amt = frappe.db.get_value("Sales Order Item", item.so_detail, ["base_net_amount", "qty", "billed_amt"])
			item.set("so_amount", base_net_amount)
			total_billed += flt(billed_amt)

			if not self.calculate_progress_globally and base_net_amount:
				already_billed = flt(billed_amt) / flt(base_net_amount) * 100.0
				item.qty = (flt(item.progress_percentage) - flt(already_billed)) / 100.0 * flt(qty)

		if not self.calculate_progress_globally:
			if sum_so_amount := sum(item.so_amount for item in items):
				self.progress_percentage = (flt(self.base_net_total) + total_billed) / sum_so_amount * 100.0

	def on_submit(self):
		super().on_submit()
		frappe.enqueue_doc(self.doctype, self.name, "generate_invoicing_summary")

	def generate_invoicing_summary(self):
		for so in list(set([item.sales_order for item in self.items])):
			doc = frappe.get_cached_doc("Sales Order", so)
			set_invoicing_summary(doc, 'on_sales_invoice_submission')
			doc.save()