frappe.ui.form.on("Quotation", {
	refresh(frm) {
		frm.item_builder = new construction.item_builder({
			frm: frm,
			$wrapper: frm.get_field("item_builder_html").$wrapper
		})
	},
})