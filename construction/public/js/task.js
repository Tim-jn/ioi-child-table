frappe.ui.form.on("Task", {
	refresh(frm) {
		if (!frm.is_new()) {
			frm.trigger("show_linked_attachments");
		}
	},
	show_linked_attachments: function(frm) {
		frappe.call({
			method: "construction.utils.tasks.get_linked_attachments",
			args: {
				task: frm.doc.name
			}
		}).then(r => {
			if (Object.keys(r.message).length) {
				frm.set_df_property("documents_section", "hidden", 0)
				new construction.document_grid({
					data: r.message,
					wrapper: frm.get_field("documents_html").$wrapper
				})
			}
		})
	}
})