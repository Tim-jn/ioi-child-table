frappe.ui.form.on("Delivery Note", {
	refresh(frm) {
		construction.setup_quotation_builder(frm);
	},
})