frappe.ui.form.on("Project", {
	refresh(frm) {
		frm.trigger("show_linked_attachments");
	},
	show_linked_attachments: function(frm) {
		frappe.call({
			method: "construction.utils.projects.get_linked_attachments",
			args: {
				project: frm.doc.name
			}
		}).then(r => {
			new construction.document_grid({
				data: r.message,
				wrapper: frm.get_field("documents_html").$wrapper
			})
		})
	}
})