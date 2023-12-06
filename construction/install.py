import click
import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def after_install():
	add_custom_fields()


def after_migrate():
	add_custom_fields()


def add_custom_fields():
	click.secho("* Adding Construction Custom Fields")
	remove_custom_fields()
	custom_fields = get_custom_fields()
	create_custom_fields(custom_fields)


def remove_custom_fields():
	to_remove = set()
	for dt, fields in get_custom_fields().items():
		for field in fields:
			to_remove.add((dt, field["fieldname"]))

	to_remove.add(("Quotation", "construction_tab"))
	to_remove.add(("Quotation Item", "subtotal"))
	to_remove.add(("Quotation Item", "dimensions_section"))
	to_remove.add(("Quotation Item", "height"))
	to_remove.add(("Quotation Item", "width"))

	for dt, fieldname in to_remove:
		frappe.delete_doc("Custom Field", f"{dt}-{fieldname}", ignore_missing=True)


def get_custom_fields_for_transaction_doctype(dt: str):
	return {
		dt: [
			{
				"fieldname": "construction_items_section",
				"fieldtype": "Section Break",
				"insert_after": "items_section",
				"print_hide": 1,
			},
			{
				"fieldname": "item_builder_html",
				"fieldtype": "HTML",
				"label": "Item Builder",
				"insert_after": "construction_items_section",
				"print_hide": 1,
			},
		],
		dt
		+ " Item": [
			{
				"fieldname": "row_type",
				"fieldtype": "Select",
				"label": "Row Type",
				"read_only": 0,
				"hidden": 0,
				"default": "",
				"options": "\nitem\ntitle1\ntitle2\ntitle3\ntext",
				"print_hide": 1,
				"insert_after": "item_name",
				"translatable": 0,
			},
			{
				"fieldname": "row_print_style",
				"fieldtype": "Select",
				"label": "Display",
				"insert_after": "row_type",
				"default": "",
				"options": "\nHide Price\nHide Row",
				"print_hide": 1,
				"translatable": 0,
			},
			{
				"fieldname": "with_subtotal",
				"fieldtype": "Check",
				"label": "With Subtotal",
				"default": 1,
				"insert_after": "row_print_style",
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
			{
				"fieldname": "address",
				"fieldtype": "Link",
				"options": "Address",
				"label": "Address",
				"insert_after": "customer",
				"mandatory_depends_on": "tax_category",
			},
			{
				"fieldname": "address_display",
				"fieldtype": "Small Text",
				"read_only": 1,
				"label": "Address Display",
				"insert_after": "address",
				"translatable": 0,
			},
			{
				"fieldname": "geolocation",
				"fieldtype": "Geolocation",
				"hidden": 1,
				"insert_after": "address_display",
				"fetch_from": "address.map_location",
				"translatable": 0,
			},
			{
				"fieldname": "tax_category",
				"fieldtype": "Link",
				"insert_after": "company",
				"options": "Tax Category",
				"label": "Tax Category",
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
