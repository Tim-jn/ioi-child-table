import frappe
from frappe import _
from frappe.utils import flt

from erpnext.accounts.doctype.sales_invoice.sales_invoice import SalesInvoice
from erpnext.controllers.accounts_controller import validate_account_head

from construction.overrides.status_updater import add_row_type_condition_to_status_updater

class InvalidProgressCalculationMethodError(frappe.ValidationError):
	pass

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
			super().validate_uom_is_integer(uom_field, qty_fields)

	def validate(self):
		self.check_sales_invoice_integrity()
		self.get_sales_order_details()
		super().validate()

		if self.is_progress_invoice:
			if len(set(item.sales_order for item in self.items if item.sales_order)) > 1:
				frappe.throw(_("A progress invoice can only be linked to a single sales order"))

			if self.update_stock:
				self.update_stock = 0
				frappe.msgprint(_("Stock cannot be updated directly from a progress invoice"), alert=True)
		else:
			self.progress_invoice_no = 0

		self.calculate_progress()

	def check_sales_invoice_integrity(self):
		if not self.is_progress_invoice or not self.calculate_progress_globally:
			return

		sales_invoice_rows = [item for item in self.items if item.row_type in ("Item", "") if item.so_detail]
		sales_order = frappe.get_doc("Sales Order", sales_invoice_rows[0].sales_order)
		sales_order_rows = [item.name for item in sales_order.items if item.row_type in ("Item", "")]
		sales_invoice_rows_details = [item.so_detail for item in sales_invoice_rows]

		if set(sales_order_rows).difference(set(sales_invoice_rows_details)):
			frappe.throw(_("This invoice doesn't match exactly the sales order. Please calculate the progress at line item level."), exc=InvalidProgressCalculationMethodError)

	def get_sales_order_details(self):
		if not self.is_progress_invoice:
			return

		for item in self.items:
			if item.so_detail and item.row_type in ("Item", ""):
				base_net_amount, qty, billed_amt = frappe.db.get_value("Sales Order Item", item.so_detail, ["base_net_amount", "qty", "billed_amt"])
				item.sales_order_qty = qty
				item.sales_order_amount = base_net_amount
				item.sales_order_billed_amount = billed_amt

				if base_net_amount:
					if self.calculate_progress_globally:
						item.progress_percentage = self.progress_percentage
					already_billed = flt(billed_amt) / flt(base_net_amount) * 100.0
					item.qty = (flt(item.progress_percentage) - flt(already_billed)) / 100.0 * flt(qty)

			elif item.so_detail:
				item.sales_order_section_total = frappe.db.get_value("Sales Order Item", item.so_detail, "section_total")

	def calculate_progress(self):
		if not self.is_progress_invoice:
			return

		items = [item for item in self.items if item.row_type in ("Item", "") and item.sales_order]
		if not items:
			return

		total_billed = sum(item.sales_order_billed_amount for item in items)
		if sum_so_amount := frappe.db.get_value("Sales Order", items[0].sales_order, "net_total"):
			self.progress_percentage = (flt(self.base_net_total) + total_billed) / sum_so_amount * 100.0

	def set_print_heading(self):
		if self.is_progress_invoice:
			print_heading = _("Progress Invoice No") + " " + str(self.progress_invoice_no)
			if not frappe.get_cached_value("Print Heading", print_heading):
				ph = frappe.new_doc("Print Heading")
				ph.print_heading = print_heading
				ph.flags.ignore_permissions = True
				ph.insert(ignore_if_duplicate=True)

			self.select_print_heading = print_heading

	def validate_qty_is_not_zero(self):
		if self.get("update_stock"):
			super.validate_qty_is_not_zero()