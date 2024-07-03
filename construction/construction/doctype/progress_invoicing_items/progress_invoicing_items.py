# Copyright (c) 2024, Dokos SAS and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint

class ProgressInvoicingItems(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		grand_total: DF.Currency
		label: DF.Data | None
		parent: DF.Data
		parentfield: DF.Data
		parenttype: DF.Data
		posting_date: DF.Date | None
		progress_percentage: DF.Percent
		sales_invoice: DF.Link | None
	# end: auto-generated types

	pass


def set_invoicing_summary(doc, method):
	doc.progress_invoicing_summary = []

	sales_order = doc.name if doc.doctype == "Sales Order" else None

	if doc.doctype == "Sales Invoice":
		if sales_orders := [item.sales_order for item in doc.items]:
			sales_order = sales_orders[0]

	if not sales_order:
		return

	filters = {"docstatus": 1, "sales_order": sales_order}
	if doc.doctype == "Sales Invoice":
		filters["parent"] = ["!=", doc.name]

	sales_invoices = frappe.get_all("Sales Invoice Item", filters=filters, pluck="parent")

	fields = ["name", "progress_percentage", "posting_date", "grand_total", "is_down_payment_invoice", "is_progress_invoice", "creation", "progress_invoice_no"]
	previous_invoices = frappe.get_all("Sales Invoice", filters={"docstatus": 1, "name": ("in", sales_invoices)}, fields=fields, order_by="posting_date ASC")
	for invoice in previous_invoices:
		invoice["label"] = get_label(invoice)
		invoice["sales_invoice"] = invoice.name
		invoice["name"] = None
		doc.append("progress_invoicing_summary", invoice)

	if previous_invoices and doc.docstatus == 0:
		progress_invoice_no = max(cint(x.progress_invoice_no) for x in previous_invoices)
		if progress_invoice_no and cint(doc.progress_invoice_no) <= progress_invoice_no:
			doc.progress_invoice_no = progress_invoice_no + 1

	doc.run_method("set_print_heading")

def get_label(invoice):
	if invoice.is_down_payment_invoice:
		return _("Down Payment")

	if invoice.progress_percentage >= 99.99:
		return _("Final Invoice")

	if invoice.is_progress_invoice:
		return _("Progress Invoice No") + " " + str(invoice.progress_invoice_no)

	return _("Sales Invoice")