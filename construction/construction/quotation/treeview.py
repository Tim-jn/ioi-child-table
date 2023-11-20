import frappe

@frappe.whitelist()
def get_children(doctype=None, parent=None, **kwargs):
	if isinstance(kwargs, str):
		kwargs = frappe.parse_json(kwargs)

	if isinstance(kwargs, dict):
		kwargs = frappe._dict(kwargs)

	fields = [
		"item_code as value",
		"parent as parent_id",
		"qty",
		"idx",
		"'Quotation Item' as doctype",
		"name",
		"uom",
		"rate",
		"amount",
	]

	query_filters = {
		"parent": kwargs.parent_id,
	}

	if kwargs.name:
		query_filters["name"] = kwargs.name

	return frappe.get_all("Quotation Item", fields=fields, filters=query_filters, order_by="idx")


@frappe.whitelist()
def delete_node(**kwargs):
	if isinstance(kwargs, str):
		kwargs = frappe.parse_json(kwargs)

	if isinstance(kwargs, dict):
		kwargs = frappe._dict(kwargs)

	items = get_children(parent=kwargs.fg_item, parent_id=kwargs.parent)
	if kwargs.docname:
		frappe.delete_doc("Quotation Item", kwargs.docname)

	for item in items:
		frappe.delete_doc("Quotation Item", item.name)
		if item.expandable:
			delete_node(fg_item=item.value, parent=item.parent_id)

	doc = frappe.get_doc("Quotation", kwargs.parent)
	doc.save()

	return doc


@frappe.whitelist()
def edit_qty(doctype, docname, qty, parent):
	frappe.db.set_value(doctype, docname, "qty", qty)
	doc = frappe.get_doc("BOM Creator", parent)
	doc.set_rate_for_items()
	doc.save()

	return doc