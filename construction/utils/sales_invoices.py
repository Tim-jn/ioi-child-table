from erpnext.accounts.doctype.sales_invoice.sales_invoice import SalesInvoice

class ConstructionSalesInvoice(SalesInvoice):
	def validate_uom_is_integer(self, uom_field, qty_fields):
		if not self.is_progress_invoice:
			super(ConstructionSalesInvoice, self).validate_uom_is_integer(uom_field, qty_fields)
