frappe.ui.form.on("Task", {
	refresh(frm) {
		frm.trigger("show_linked_attachments");
	},
	show_linked_attachments: function(frm) {
		frappe.call({
			method: "construction.utils.tasks.get_linked_attachments",
			args: {
				task: frm.doc.name
			}
		}).then(r => {
			new construction.document_grid({
				data: r.message,
				wrapper: frm.get_field("documents_html").$wrapper
			})
		})
	}
})