frappe.ui.form.on("Sales Order", {
	refresh(frm) {
		construction.setup_quotation_builder(frm);
	},
})