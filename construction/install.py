import click
import frappe
from frappe import _
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
	for custom_fields in [
		get_custom_fields(),
		get_progress_invoicing_fields(),
		get_custom_fields_for_progress_invoicing_summary("Sales Invoice"),
		get_custom_fields_for_progress_invoicing_summary("Sales Order"),
	]:
		for dt, fields in custom_fields.items():
			for df in fields:
				df["module"] = "Construction"
		create_custom_fields(custom_fields)


def get_custom_fields_for_selling_doctype(dt: str):
	# For translations
	__ = _("Item Builder")
	__ = _("Row Type")
	__ = _("Row Type")
	__ = _("Display")
	__ = _("With Subtotal")
	__ = _("Section Total")

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
				"hidden": 1,
				"default": "",
				"options": "\nitem\ntitle1\ntitle2\ntitle3\ntext",
				"print_hide": 1,
				"insert_after": "item_name",
				"translatable": 0,
				"allow_on_submit": 1,
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
				"allow_on_submit": 1,
			},
			{
				"fieldname": "with_subtotal",
				"fieldtype": "Check",
				"label": "With Subtotal",
				"default": 1,
				"insert_after": "row_print_style",
				"depends_on": "eval:doc.row_type?.startsWith?.('title')",
				"print_hide": 1,
				"allow_on_submit": 1,
			},
			{
				"fieldname": "section_total",
				"fieldtype": "Currency",
				"label": "Section Total",
				"insert_after": "with_subtotal",
				"print_hide": 1,
				"allow_on_submit": 1,
				"read_only": 1,
				"depends_on": "eval:doc.row_type?.startsWith?.('title')",
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
		(dt + " Item"): [
			{
				"fieldname": "row_print_style",
				"fieldtype": "Select",
				"label": "Display",
				"insert_after": "row_type",
				"default": "",
				"options": "\nHide Price\nHide Row",
				"print_hide": 1,
				"translatable": 0,
				"allow_on_submit": 1,
			},
		],
	}


def get_custom_fields_for_progress_invoicing_summary(dt: str):
	# For translations
	__ = _("Generated Invoices")
	__ = _("Invoicing Summary")

	return {
		dt: [
			{
				"fieldname": "progress_invoicing_summary_section",
				"label": "Invoicing Summary",
				"fieldtype": "Tab Break",
				"print_hide": 1,
				"insert_after": "connections_tab",
			},
			{
				"fieldname": "progress_invoicing_summary",
				"fieldtype": "Table",
				"options": "Progress Invoicing Items",
				"label": "Generated Invoices",
				"insert_after": "progress_invoicing_summary_section",
				"allow_on_submit": 1,
				"read_only": 1,
			},
		],
	}


def get_progress_invoicing_fields():
	# For translations
	__ = _("Is Progress Invoice")
	__ = _("Progress Invoice No")
	__ = _("Calculate Progress Globally")
	__ = _("Progress Percentage")
	__ = _("Sales Order Quantity")
	__ = _("Sales Order Amount")
	__ = _("Sales Order Billed Amount")

	return {
		"Sales Invoice": [
			{
				"fieldname": "is_progress_invoice",
				"fieldtype": "Check",
				"label": "Is Progress Invoice",
				"insert_after": "is_down_payment_invoice",
			},
			{
				"fieldname": "progress_invoice_no",
				"fieldtype": "Int",
				"label": "Progress Invoice No",
				"insert_after": "is_progress_invoice",
				"depends_on": "is_progress_invoice",
				"read_only": True,
				"no_copy": True,
				"default": "1",
			},
			{
				"fieldname": "calculate_progress_globally",
				"fieldtype": "Check",
				"label": "Calculate Progress Globally",
				"insert_after": "progress_invoice_no",
				"depends_on": "is_progress_invoice",
				"default": "1",
			},
			{
				"fieldname": "progress_percentage",
				"fieldtype": "Percent",
				"label": "Progress Percentage",
				"insert_after": "calculate_progress_globally",
				"depends_on": "is_progress_invoice",
				"read_only_depends_on": "eval:!doc.calculate_progress_globally",
			},
		],
		"Sales Invoice Item": [
			{
				"fieldname": "progress_percentage",
				"fieldtype": "Percent",
				"label": "Progress Percentage",
				"insert_after": "qty",
				"depends_on": "eval:parent.is_progress_invoice",
				"read_only_depends_on": "eval:!parent.is_progress_invoice || parent.calculate_progress_globally",
			},
			{
				"fieldname": "sales_order_qty",
				"fieldtype": "Float",
				"label": "Sales Order Quantity",
				"insert_after": "progress_percentage",
				"depends_on": "eval:parent.is_progress_invoice",
				"read_only": 1,
			},
			{
				"fieldname": "sales_order_amount",
				"fieldtype": "Currency",
				"label": "Sales Order Amount",
				"insert_after": "sales_order_qty",
				"depends_on": "eval:parent.is_progress_invoice",
				"read_only": 1,
			},
			{
				"fieldname": "sales_order_billed_amount",
				"fieldtype": "Currency",
				"label": "Sales Order Billed Amount",
				"insert_after": "sales_order_amount",
				"depends_on": "eval:parent.is_progress_invoice",
				"read_only": 1,
			},
			{
				"fieldname": "sales_order_section_total",
				"fieldtype": "Currency",
				"label": "Sales Order Section Total",
				"insert_after": "with_subtotal",
				"depends_on": "eval:parent.is_progress_invoice && doc.row_type?.startsWith?.('title')",
				"read_only": 1,
				"print_hide": 1,
				"allow_on_submit": 1,
			},
		],
	}


def get_custom_fields():
	# For translations
	__ = _("Documents")
	__ = _("Address")
	__ = _("Address")

	return {
		**get_custom_fields_for_selling_doctype("Quotation"),
		**get_custom_fields_for_selling_doctype("Sales Order"),
		**get_custom_fields_for_selling_doctype("Sales Invoice"),
		**get_custom_fields_for_selling_doctype("Delivery Note"),
		**get_custom_fields_for_buying_doctype("Supplier Quotation"),
		**get_custom_fields_for_buying_doctype("Purchase Order"),
		# **get_custom_fields_for_buying_doctype("Purchase Invoice"),
		"Project": [
			{
				"fieldname": "documents_tab",
				"fieldtype": "Tab Break",
				"label": "Documents",
				"insert_after": "message",
			},
			{
				"fieldname": "documents_section",
				"fieldtype": "Section Break",
				"insert_after": "documents_tab",
				"hidden": 1,
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
				"hidden": 1,
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
		is_system_generated=True,
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
		is_system_generated=True,
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
		is_system_generated=True,
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
		is_system_generated=True,
	)

	frappe.make_property_setter(
		dict(
			doctype="Sales Order Item",
			doctype_or_field="DocField",
			fieldname="cost_center",
			property="reqd",
			value=0,
			property_type="Check",
		),
		validate_fields_for_doctype=False,
		is_system_generated=True,
	)

	frappe.make_property_setter(
		dict(
			doctype="Sales Order Item",
			doctype_or_field="DocField",
			fieldname="cost_center",
			property="mandatory_depends_on",
			value="eval:['', 'item'].includes(doc.row_type)",
			property_type="Text",
		),
		validate_fields_for_doctype=False,
		is_system_generated=True,
	)

	frappe.make_property_setter(
		dict(
			doctype="Sales Invoice",
			doctype_or_field="DocField",
			fieldname="update_stock",
			property="hidden",
			value=1,
			property_type="Check",
		),
		validate_fields_for_doctype=False,
		is_system_generated=True,
	)

	for field in ["is_down_payment_invoice", "is_return", "is_debit_note"]:
		frappe.make_property_setter(
			dict(
				doctype="Sales Invoice",
				doctype_or_field="DocField",
				fieldname=field,
				property="depends_on",
				value="eval:!doc.is_progress_invoice",
				property_type="Data",
			),
			validate_fields_for_doctype=False,
			is_system_generated=True,
		)
