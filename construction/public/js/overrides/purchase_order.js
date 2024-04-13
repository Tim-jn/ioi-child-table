frappe.ui.form.on("Purchase Order", {
	refresh(frm) {
		construction.setup_quotation_builder(frm);
	},
})