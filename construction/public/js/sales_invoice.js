frappe.ui.form.on("Sales Invoices", {
	refresh(frm) {
		frm.item_builder = new construction.item_builder({
			frm: frm,
			$wrapper: frm.get_field("item_builder_html").$wrapper,
		})
	},

	progress_percentage(frm) {
		frm.doc.items.forEach(row => {
			calculate_progress(row, frm.doc.progress_percentage)
		})
	},
})

const calculate_progress = async(line, progress) => {
	if (line.sales_order && line.so_detail) {
		const so = await frappe.db.get_value("Sales Order", line.sales_order, "per_billed")
		const soi = await frappe.db.get_value("Sales Order Item", line.so_detail, "qty", null, "Sales Order")
		frappe.model.set_value(line.doctype, line.name, "qty", (flt(progress) - flt(so.message.per_billed)) / 100.0 * flt(soi.message.qty))
	}
}