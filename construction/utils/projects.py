import frappe

from construction.utils import get_linked_attachements_for_doc

@frappe.whitelist()
def get_linked_attachments(project):
	return get_linked_attachements_for_doc("Project", project)
