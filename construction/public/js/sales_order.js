frappe.ui.form.on("Sales Order", {
	setup(frm) {
		frm.item_builder = new construction.item_builder({
			frm: frm,
			$wrapper: frm.get_field("item_builder_html").$wrapper,
		})
	},
})