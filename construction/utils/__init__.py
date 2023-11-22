from collections import defaultdict

import frappe

from frappe.desk.form.linked_with import get

def get_linked_attachements_for_doc(dt, dn):
	linked_documents = get(dt, dn)
	files = []

	for linked_document in linked_documents:
		linked_document_names = []
		for doc in linked_documents[linked_document]:
			linked_document_names.append(doc.get("name"))

		files += frappe.get_list(
			"File",
			filters={
				"attached_to_doctype": linked_document,
				"attached_to_name": ("in", linked_document_names),
			},
			fields=[
				"name",
				"file_name",
				"file_type",
				"thumbnail_url",
				"attached_to_doctype",
				"attached_to_name",
				"creation",
				"file_url",
				"creation",
			],
			order_by="creation DESC",
		)

	files_by_reference = defaultdict(lambda: defaultdict(list))
	for file in files:
		files_by_reference[file.attached_to_doctype][file.attached_to_name].append(file)

	return files_by_reference