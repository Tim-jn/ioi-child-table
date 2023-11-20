import click

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def after_install():
	add_custom_fields()


def add_custom_fields():
	click.secho("* Adding Construction Custom Fields")
	custom_fields = get_custom_fields()
	create_custom_fields(custom_fields)

	for dt in custom_fields:
		frappe.clear_cache(doctype=dt)


def get_custom_fields():
	return {
		"Quotation": [
			{
				"fieldname": "construction_tab",
				"fieldtype": "Tab Break",
				"label": "Chantier",
				"insert_after": "connections_tab",
			},
			{
				"fieldname": "item_builder_html",
				"fieldtype": "HTML",
				"label": "Item Builder",
				"insert_after": "construction_tab",
			},
		],
		"Quotation Item": [
			{
				"fieldname": "row_type",
				"fieldtype": "Select",
				"label": "Row Type",
				"read_only": 1,
				"options": "title1\ntitle2\ntitle3\ntext\nitem",
				"default": "item"
			},
			{
				"fieldname": "dimensions_section",
				"fieldtype": "Section Break",
				"label": "Dimensions",
				"insert_after": "cost_price",
			},
			{
				"fieldname": "height",
				"fieldtype": "Int",
				"label": "Height",
				"insert_after": "dimensions_section",
			},
			{
				"fieldname": "width",
				"fieldtype": "Int",
				"label": "Width",
				"insert_after": "height",
			},
			{
				"fieldname": "subtotal",
				"fieldtype": "Check",
				"label": "Sub-Total",
				"insert_after": "page_break",
				"read_only": 1
			},
		]
	}