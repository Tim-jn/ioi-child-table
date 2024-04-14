frappe.ui.form.on("Supplier Quotation", {
	refresh(frm) {
		construction.setup_quotation_builder(frm);
	}
})