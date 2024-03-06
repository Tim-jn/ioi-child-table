# Copyright (c) 2024, Dokos SAS and contributors
# For license information, please see license.txt

import frappe
from frappe import _

from frappe.query_builder.functions import Sum

def execute(filters=None):
	columns, data = get_columns(filters), get_data(filters)
	return columns, data


def get_columns(filters):
	return [
		{
			"label": _("Project", context="Markup by Project"),
			"fieldtype": "Link",
			"fieldname": "project",
			"options": "Project",
			"width": 200,
		},
		{
			"label": _("Markup on quotation", context="Markup by Project"),
			"fieldtype": "Percent",
			"fieldname": "markup_on_quotation",
			"width": 150,
		},
		{
			"label": _("Sales on quotation", context="Markup by Project"),
			"fieldtype": "Currency",
			"fieldname": "sales_on_quotation",
			"options": "Company:currency",
			"width": 180,
		},
		{
			"label": _("Purchases on quotation", context="Markup by Project"),
			"fieldtype": "Currency",
			"fieldname": "purchases_on_quotation",
			"options": "Company:currency",
			"width": 180,
		},
		{
			"label": _("Percent Complete", context="Markup by Project"),
			"fieldtype": "Percent",
			"fieldname": "percent_complete",
			"width": 180,
		},
		{
			"label": _("Actual Purchases", context="Markup by Project"),
			"fieldtype": "Currency",
			"fieldname": "actual_purchases",
			"options": "Company:currency",
			"width": 180,
		},
		{
			"label": _("Actual Markup", context="Markup by Project"),
			"fieldtype": "Percent",
			"fieldname": "actual_markup",
			"width": 150,
		},
	]


def get_data(filters):
	quotation = frappe.qb.DocType("Quotation")
	quotation_item = frappe.qb.DocType("Quotation Item")
	sales_order = frappe.qb.DocType("Sales Order")
	sales_order_item = frappe.qb.DocType("Sales Order Item")
	sales_invoice_item = frappe.qb.DocType("Sales Invoice Item")
	sales_invoice = frappe.qb.DocType("Sales Invoice")
	purchase_order_item = frappe.qb.DocType("Purchase Order Item")
	purchase_invoice_item = frappe.qb.DocType("Purchase Invoice Item")
	project = frappe.qb.DocType("Project")

	query = (
		frappe.qb.from_(project)
		.left_join(sales_order)
		.on(((sales_order.project == project.name) | (sales_order.name == project.sales_order)) & (sales_order.docstatus == 1))
		.left_join(sales_order_item)
		.on((sales_order.name == sales_order_item.parent) & (sales_order_item.docstatus == 1))
		.left_join(quotation_item)
		.on((sales_order_item.quotation_item == quotation_item.name) & (quotation_item.docstatus == 1))
		.left_join(quotation)
		.on((quotation.name == quotation_item.parent) & (quotation_item.docstatus == 1))
		.left_join(sales_invoice_item)
		.on((sales_order_item.name == sales_invoice_item.so_detail) & (sales_invoice_item.docstatus == 1))
		.left_join(sales_invoice)
		.on((sales_invoice.name == sales_invoice_item.parent) & (sales_invoice.docstatus == 1))
		.left_join(purchase_order_item)
		.on((sales_order_item.name == purchase_order_item.sales_order_item) & (purchase_order_item.docstatus == 1))
		.left_join(purchase_invoice_item)
		.on((purchase_invoice_item.name == purchase_invoice_item.po_detail) & (purchase_invoice_item.docstatus == 1))
		.select(quotation.name, quotation.markup_percentage, quotation.net_total)
		.select(project.name, project.percent_complete)
		.select(Sum(quotation_item.unit_cost_price * quotation_item.qty).as_("unit_cost"))
		.select(Sum(purchase_invoice_item.base_net_amount).as_("purchase_invoice_base_net_amount"))
		.where(quotation_item.row_type.isin(("item", "")))
		.groupby(project.name)
	)

	if filters.project:
		query = query.where(project.name == filters.project)

	if filters.expected_start_date and not filters.project:
		query = query.where(project.expected_start_date >= filters.expected_start_date)

	if filters.expected_end_date and not filters.project:
		query = query.where(project.expected_end_date <= filters.expected_end_date)

	transaction_data = query.run(as_dict=True)

	result = []
	for data in transaction_data:

		quotation_net_total = data.get("net_total") or 0.0
		actual_purchases = data.get("purchase_invoice_base_net_amount") or 0.0
		percent_complete = data.get("percent_complete") or 0.0
		quotation_unit_cost = data.get("unit_cost")

		row = ({
			"project": data.get("name"),
			"markup_on_quotation": data.get("markup_percentage"),
			"sales_on_quotation": quotation_net_total,
			"purchases_on_quotation": quotation_unit_cost,
			"percent_complete": percent_complete,
			"actual_purchases": actual_purchases,
			"actual_markup": (quotation_net_total * percent_complete / 100 - actual_purchases) / (quotation_net_total * percent_complete / 100) * 100.0 if (quotation_unit_cost * percent_complete) else 0.0
		})

		result.append(row)

	return result