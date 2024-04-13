import click
import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def after_install():
	add_custom_fields()
	add_property_setters()
	setup_default_quotation_builder_columns()


def after_migrate():
	add_custom_fields()
	add_property_setters()
	setup_default_quotation_builder_columns()


def add_custom_fields():
	click.secho("* Adding Construction Custom Fields")
	custom_fields = get_custom_fields()
	create_custom_fields(custom_fields)


def get_custom_fields_for_selling_doctype(dt: str):
	child_dt = dt + " Item"
	return {
		dt: [
			{
				"fieldname": "construction_items_section",
				"fieldtype": "Section Break",
				"insert_after": "items",
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
		child_dt: [
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


def get_custom_fields_for_buying_doctype(dt: str):
	return {
		dt: [
			{
				"fieldname": "construction_items_section",
				"fieldtype": "Section Break",
				"insert_after": "items",
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
	}


def get_custom_fields():
	return {
		**get_custom_fields_for_selling_doctype("Quotation"),
		**get_custom_fields_for_selling_doctype("Sales Order"),
		**get_custom_fields_for_selling_doctype("Sales Invoice"),
		**get_custom_fields_for_buying_doctype("Supplier Quotation"),
		**get_custom_fields_for_buying_doctype("Purchase Order"),
		# **get_custom_fields_for_buying_doctype("Purchase Invoice"),
		"Project": [
			{
				"fieldname": "documents_tab",
				"fieldtype": "Tab Break",
				"label": "Documents",
				"insert_after": "message"
			},
			{
				"fieldname": "documents_section",
				"fieldtype": "Section Break",
				"insert_after": "documents_tab",
				"hidden": 1
			},
			{
				"fieldname": "documents_html",
				"fieldtype": "HTML",
				"label": "Documents",
				"insert_after": "documents_section",
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
				"fieldname": "documents_section",
				"fieldtype": "Section Break",
				"insert_after": "documents_tab",
				"hidden": 1
			},
			{
				"fieldname": "documents_html",
				"fieldtype": "HTML",
				"label": "Documents",
				"insert_after": "documents_tab",
			},
		],
	}


def setup_default_quotation_builder_columns():
	settings = frappe.get_single("Construction App Settings")
	if not settings.quotation_builder_columns:
		print("* Setting up default Quotation Builder columns")
		settings.set(
			"quotation_builder_columns",
			map(
				lambda x: {"fieldname": x},
				[
					"item_code",
					"item_name",
					"description",
					"qty",
					"uom",
					"base_unit_cost_price",
					"additional_costs_percentage",
					"additional_costs_amount",
					"unit_cost_price",
					"gross_profit_percentage",
					"rate",
					"amount",
					"row_print_style",
				],
			),
		)
		settings.save()


def add_property_setters():
	frappe.make_property_setter(
		dict(
			doctype="Sales Invoice Item",
			doctype_or_field="DocField",
			fieldname="income_account",
			property="reqd",
			value=0,
			property_type="Check",
		),
		validate_fields_for_doctype=False,
		is_system_generated=True
	)

	frappe.make_property_setter(
		dict(
			doctype="Sales Invoice Item",
			doctype_or_field="DocField",
			fieldname="income_account",
			property="mandatory_depends_on",
			value="eval:['', 'item'].includes(doc.row_type)",
			property_type="Text",
		),
		validate_fields_for_doctype=False,
		is_system_generated=True
	)

	frappe.make_property_setter(
		dict(
			doctype="Sales Invoice Item",
			doctype_or_field="DocField",
			fieldname="cost_center",
			property="reqd",
			value=0,
			property_type="Check",
		),
		validate_fields_for_doctype=False,
		is_system_generated=True
	)

	frappe.make_property_setter(
		dict(
			doctype="Sales Invoice Item",
			doctype_or_field="DocField",
			fieldname="cost_center",
			property="mandatory_depends_on",
			value="eval:['', 'item'].includes(doc.row_type)",
			property_type="Text",
		),
		validate_fields_for_doctype=False,
		is_system_generated=True
	)