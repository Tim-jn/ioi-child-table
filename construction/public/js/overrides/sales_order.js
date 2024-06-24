frappe.ui.form.on("Sales Order", {
	refresh(frm) {
		construction.setup_quotation_builder(frm);

		if(!["Closed", "On Hold"].includes(frm.doc.status) && flt(frm.doc.per_billed, 2) < 100) {
			frm.add_custom_button(__('Progress Invoice'), () => {
				frappe.model.open_mapped_doc({
					method: "construction.override.sales_order.make_progress_invoice",
					frm: frm
				})
			}, __('Create'));
		}
	},

	refresh(frm) {
		if(!["Closed", "On Hold"].includes(frm.doc.status) && flt(frm.doc.per_billed, 2) < 100) {
			frm.add_custom_button(__('Progress Invoice'), () => {
				frappe.model.open_mapped_doc({
					method: "construction.utils.sales_orders.make_progress_invoice",
					frm: frm
				})
			}, __('Create'));
		}
	}
})