# Copyright (c) 2024, Dokos SAS and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document

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

	fields = ["name", "progress_percentage", "posting_date", "grand_total", "is_down_payment_invoice", "is_progress_invoice", "creation"]
	situation_no = 0
	for invoice in frappe.get_all("Sales Invoice", filters={"docstatus": 1, "name": ("in", sales_invoices)}, fields=fields, order_by="posting_date ASC"):
		if invoice.is_progress_invoice:
			situation_no += 1

		invoice["label"] = get_label(invoice, situation_no)
		invoice["sales_invoice"] = invoice.name
		invoice["name"] = None
		doc.append("progress_invoicing_summary", invoice)


def get_label(invoice, situation_no):
	if invoice.is_down_payment_invoice:
		return _("Down Payment")

	if invoice.progress_percentage >= 99.99:
		return _("Final Invoice")

	if invoice.is_progress_invoice:
		return _("Progress Invoice no") + " " + str(situation_no)

	return _("Sales Invoice")