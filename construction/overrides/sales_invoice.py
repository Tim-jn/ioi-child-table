
from frappe import _

from erpnext.accounts.doctype.sales_invoice.sales_invoice import SalesInvoice
from erpnext.controllers.accounts_controller import validate_account_head

from construction.overrides.status_updater import add_row_type_condition_to_status_updater

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