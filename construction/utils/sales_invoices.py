import frappe
from frappe import _

from erpnext.accounts.doctype.sales_invoice.sales_invoice import SalesInvoice

class ConstructionSalesInvoice(SalesInvoice):
	def validate(self):
		super(ConstructionSalesInvoice, self).validate()
		if self.is_progress_invoice:
			if len(set(item.sales_order for item in self.items)) > 1:
				frappe.throw(_("A progress invoice can only be linked to a single sales order"))

			if self.update_stock:
				self.update_stock = 0
				frappe.msgprint(_("Stock cannot be updated directly from a progress invoice"))

	def validate_uom_is_integer(self, uom_field, qty_fields):
		if not self.is_progress_invoice:
			super(ConstructionSalesInvoice, self).validate_uom_is_integer(uom_field, qty_fields)
