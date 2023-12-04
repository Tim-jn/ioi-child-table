frappe.ui.form.on("Project", {
	refresh(frm) {
		frm.set_query("address", function() {
			if(frm.doc.customer) {
				return {
					query: 'frappe.contacts.doctype.address.address.address_query',
					filters: {
						link_doctype: 'Customer',
						link_name: frm.doc.customer
					}
				};
			}
		});

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
	},

	address: function(frm) {
		erpnext.utils.get_address_display(
			frm,
			"address",
			"address_display",
			true
		);
	}
})