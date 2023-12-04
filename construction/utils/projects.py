import frappe

from construction.utils import get_linked_attachements_for_doc

@frappe.whitelist()
def get_linked_attachments(project):
	return get_linked_attachements_for_doc("Project", project)


def on_update(doc, method=None):
	if doc.tax_category and doc.address:
		if frappe.db.get_value("Address", doc.address, "tax_category") != doc.tax_category:
			frappe.db.set_value("Address", doc.address, "tax_category", doc.tax_category)