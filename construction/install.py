import click

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def after_install():
	add_custom_fields()


def after_migrate():
	add_custom_fields()


def add_custom_fields():
	click.secho("* Adding Construction Custom Fields")
	custom_fields = get_custom_fields()
	create_custom_fields(custom_fields)

	for dt in custom_fields:
		frappe.clear_cache(doctype=dt)


def get_custom_fields_for_transaction_doctype(dt: str):
	return {
		dt: [
			{
				"fieldname": "construction_tab",
				"fieldtype": "Tab Break",
				"label": "Chantier",
				"insert_after": "connections_tab",
				"print_hide": 1,
			},
			{
				"fieldname": "item_builder_html",
				"fieldtype": "HTML",
				"label": "Item Builder",
				"insert_after": "construction_tab",
				"print_hide": 1,
			},
		],
		dt + " Item": [
			{
				"fieldname": "row_type",
				"fieldtype": "Select",
				"label": "Row Type",
				# "hidden": 1,
				"options": "\nitem\ntitle1\ntitle2\ntitle3\ntext",
				"default": "",
				"print_hide": 1,
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
				"fieldname": "with_subtotal",
				"fieldtype": "Check",
				"label": "With Subtotal",
				"insert_after": "page_break",
				"depends_on": "eval:doc.row_type?.startsWith?.('title')",
				"print_hide": 1,
			},
		],
	}

def get_custom_fields():
	return {
		**get_custom_fields_for_transaction_doctype("Quotation"),
		"Project": [
			{
				"fieldname": "documents_tab",
				"fieldtype": "Tab Break",
				"label": "Documents",
				"insert_after": "message",
			},
			{
				"fieldname": "documents_html",
				"fieldtype": "HTML",
				"label": "Documents",
				"insert_after": "documents_tab",
			},
		],
		"Task": [
			{
				"fieldname": "documents_tab",
				"fieldtype": "Tab Break",
				"label": "Documents",
				"insert_after": "template_task",
			},
			{
				"fieldname": "documents_html",
				"fieldtype": "HTML",
				"label": "Documents",
				"insert_after": "documents_tab",
			},
		],
	}