
from frappe import _

from erpnext.accounts.doctype.sales_invoice.sales_invoice import SalesInvoice
from erpnext.controllers.accounts_controller import validate_account_head

class ConstructionSalesInvoice(SalesInvoice):
	def validate_income_account(self):
		for item in self.get("items"):
			if item.row_type not in ["", "item"]:
				continue

			validate_account_head(
				item.idx, item.income_account, self.company, _("Income", context="Account Validation")
			)