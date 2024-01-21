# Copyright (c) 2023, Dokos SAS and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import flt

def execute(filters=None):
	filters = frappe._dict(filters or {})
	columns, data = get_columns(filters), get_data(filters)
	return columns, data

# TODO: Get valuation rate for stock items instead of last purchase price

def get_columns(filters=None):
	columns = []
	if not filters.quotation:
		columns.append({
			"label": _("Quotation"),
			"fieldtype": "Link",
			"fieldname": "quotation",
			"options": "Quotation",
			"width": 180,
		})

	columns.extend([
		{
			"label": _("Item Code"),
			"fieldtype": "Link",
			"fieldname": "item_code",
			"options": "Item",
			"width": 180,
		},
		{
			"label": _("Item Name"),
			"fieldtype": "Data",
			"fieldname": "item_name",
			"width": 200,
		},
		{
			"label": _("Quotation Cost Price"),
			"fieldtype": "Currency",
			"fieldname": "quotation_cost_price",
			"options": "company:currency",
			"width": 180,
		},
		{
			"label": _("Quotation Selling Price"),
			"fieldtype": "Currency",
			"fieldname": "quotation_selling_price",
			"options": "company:currency",
			"width": 180,
		},
		{
			"label": _("Quotation Margin %"),
			"fieldtype": "Percent",
			"fieldname": "quotation_margin_percentage",
			"width": 180,
		},
		{
			"label": _("Quotation Markup %"),
			"fieldtype": "Percent",
			"fieldname": "quotation_markup_percentage",
			"width": 180,
		},
		{
			"label": _("Quotation Margin"),
			"fieldtype": "Currency",
			"fieldname": "quotation_margin_amount",
			"width": 180,
			"options": "company:currency"
		},
		{
			"label": _("Sales Invoice Cost Price"),
			"fieldtype": "Currency",
			"fieldname": "invoice_cost_price",
			"options": "company:currency",
			"width": 180,
		},
		{
			"label": _("Sales Invoice Selling Price"),
			"fieldtype": "Currency",
			"fieldname": "invoice_selling_price",
			"options": "company:currency",
			"width": 180,
		},
		{
			"label": _("Sales Invoice Margin %"),
			"fieldtype": "Percent",
			"fieldname": "invoice_margin_percentage",
			"width": 180,
		},
		{
			"label": _("Sales Invoice Margin"),
			"fieldtype": "Currency",
			"fieldname": "invoice_margin_amount",
			"width": 180,
			"options": "company:currency"
		},
	])

	return columns

def get_data(filters):
	quotation_item = frappe.qb.DocType("Quotation Item")
	sales_order_item = frappe.qb.DocType("Sales Order Item")
	sales_invoice_item = frappe.qb.DocType("Sales Invoice Item")
	sales_invoice = frappe.qb.DocType("Sales Invoice")
	purchase_order_item = frappe.qb.DocType("Purchase Order Item")
	purchase_invoice_item = frappe.qb.DocType("Purchase Invoice Item")

	query = (
		frappe.qb.from_(quotation_item)
		.left_join(sales_order_item)
		.on(quotation_item.name == sales_order_item.quotation_item)
		.left_join(sales_invoice_item)
		.on(sales_order_item.name == sales_invoice_item.so_detail)
		.left_join(sales_invoice)
		.on(sales_invoice.name == sales_invoice_item.parent)
		.left_join(purchase_order_item)
		.on(sales_order_item.name == purchase_order_item.sales_order_item)
		.left_join(purchase_invoice_item)
		.on(purchase_order_item.name == purchase_invoice_item.po_detail)
		.select(quotation_item.parent, quotation_item.item_code, quotation_item.item_name, quotation_item.qty.as_("quotation_qty"), quotation_item.gross_profit.as_("quotation_gross_profit"))
		.select(quotation_item.unit_cost_price.as_("quotation_unit_cost_price"), quotation_item.base_net_rate.as_("quotation_base_net_rate"), quotation_item.base_net_amount.as_("quotation_base_net_amount"))
		.select(quotation_item.gross_profit_percentage, quotation_item.markup_percentage)
		.select(sales_invoice_item.name.as_("siname"), sales_invoice_item.qty.as_("sales_invoice_qty"))
		.select(sales_invoice_item.project, sales_invoice_item.cost_center, sales_invoice.posting_date)
		.select(sales_invoice_item.base_net_rate.as_("sales_invoice_base_net_rate"), sales_invoice_item.base_net_amount.as_("sales_invoice_base_net_amount"))
		.select(purchase_invoice_item.base_net_rate.as_("purchase_invoice_base_net_rate"), purchase_invoice_item.base_net_amount.as_("purchase_invoice_base_net_amount"))
		.where(quotation_item.row_type.isin(("item", "")))
	)

	if filters.quotation:
		query = query.where(quotation_item.parent == filters.quotation)

	transaction_data = query.run(as_dict=True)

	result = []

	for data in transaction_data:
		row = ({
			"quotation": data.get("parent"),
			"item_code": data.get("item_code"),
			"item_name": data.get("item_name"),
			"quotation_cost_price": data.get("quotation_unit_cost_price"),
			"quotation_selling_price": data.get("quotation_base_net_rate"),
			"quotation_margin_percentage": data.get("gross_profit_percentage"),
			"quotation_markup_percentage": data.get("markup_percentage"),
			"quotation_margin_amount": data.get("quotation_gross_profit"),
		})

		unit_cost_price = get_unit_cost_price(data)
		cost_price = get_cost_price(data, unit_cost_price, data.get("sales_invoice_qty") or 1)

		row.update({
			"invoice_cost_price": unit_cost_price,
			"invoice_selling_price": data.get("sales_invoice_base_net_rate"),
			"invoice_margin_percentage": ((data.get("sales_invoice_base_net_rate") or 0.0 - unit_cost_price) * 100 / unit_cost_price) if unit_cost_price else 0.0,
			"invoice_margin_amount": data.get("sales_invoice_base_net_amount") or 0.0 - cost_price
		})

		result.append(row)

	return result


def get_unit_cost_price(data):
	if data.get("purchase_invoice_base_net_rate"):
		return data.get("purchase_invoice_base_net_rate")

	return get_last_purchase_rate(data["item_code"], data)

def get_cost_price(data, unit_cost_price=None, qty=None):
	if data.get("purchase_invoice_base_net_amount"):
		return data.get("purchase_invoice_base_net_amount")

	if unit_cost_price:
		return unit_cost_price * qty

	return 0.0


def get_last_purchase_rate(item_code, data):
		purchase_invoice = frappe.qb.DocType("Purchase Invoice")
		purchase_invoice_item = frappe.qb.DocType("Purchase Invoice Item")

		query = (
			frappe.qb.from_(purchase_invoice_item)
			.inner_join(purchase_invoice)
			.on(purchase_invoice.name == purchase_invoice_item.parent)
			.select(purchase_invoice_item.base_rate / purchase_invoice_item.conversion_factor)
			.where(purchase_invoice.docstatus == 1)
			.where(purchase_invoice.posting_date <= data.get("posting_date"))
			.where(purchase_invoice_item.item_code == item_code)
		)

		if data.get("project"):
			query.where(purchase_invoice_item.project.isin([data.project, None]))

		if data.get("cost_center"):
			query.where(purchase_invoice_item.cost_center.isin([data.cost_center, None]))

		query.orderby(purchase_invoice.posting_date, order=frappe.qb.desc)
		query.limit(1)

		last_purchase_rate = query.run()

		return flt(last_purchase_rate[0][0]) if last_purchase_rate else 0