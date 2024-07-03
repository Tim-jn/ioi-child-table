frappe.ui.form.on("Sales Order", {
	refresh(frm) {
		construction.setup_quotation_builder(frm);

		if(!["Closed", "On Hold"].includes(frm.doc.status) && flt(frm.doc.per_billed, 2) < 100) {
			frm.add_custom_button(__('Progress Invoice'), async () => {
				const current_percentage = await frappe.call({
					method: "construction.overrides.sales_order.get_progress_percentage",
					args: {
						sales_order: frm.doc
					}
				});

				frappe.prompt(
					{
						label: __("Invoicing Percentage"),
						fieldname: "progress_percentage",
						fieldtype: "Percent",
						default: current_percentage.message,
					},
					(values) => {
						frappe.model.open_mapped_doc({
							method: "construction.overrides.sales_order.make_progress_invoice",
							frm: frm,
							args: {
								progress_percentage: values.progress_percentage,
							},
						})
					}
				)
			}, __('Create'));
		}
	},
})