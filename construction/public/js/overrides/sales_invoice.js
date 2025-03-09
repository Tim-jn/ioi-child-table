frappe.ui.form.on("Sales Invoice", {
	refresh(frm) {
		construction.setup_quotation_builder(frm);
	},

	progress_percentage(frm) {
		if (frm.doc.is_down_payment_invoice && frm.doc.calculate_progress_globally) {
			frm.doc.items.forEach(row => {
				calculate_progress(frm, row, frm.doc.progress_percentage)
			})
		}
	},
})

frappe.ui.form.on("Sales Invoice Item", {
	progress_percentage(frm, cdt, cdn) {
		const row = locals[cdt][cdn]

		if (!frm.doc.is_down_payment_invoice) {
			row.progress_percentage = 0.0;
			return
		}

		if (row.progress_percentage == 0.0) {
			frappe.show_alert({
				message: __("An item cannot be billed with a quantity of 0.<br>Please remove the line from your invoice."),
				indicator: "orange"
			})
		}

		if (!frm.doc.calculate_progress_globally) {
			calculate_progress(frm, row, row.progress_percentage)
		} else {
			calculate_total_progress(frm);
		}
	},

	qty(frm, cdt, cdn) {
		if (!frm.doc.is_down_payment_invoice) {
			return
		}

		const row = locals[cdt][cdn]

		if (row.qty == 0.0) {
			frappe.show_alert({
				message: __("An item cannot be billed with a quantity of 0.<br>Please remove the line from your invoice."),
				indicator: "orange"
			})
		}

		if (!frm.doc.calculate_progress_globally) {
			calculate_progress_from_qty(frm, row)
		} else {
			calculate_total_progress(frm);
		}
	},
})


const calculate_progress = async(frm, line, progress) => {
	if (!frm.dont_calculate_progress && line.sales_order && line.so_detail && ["item", ""].includes(line.row_type)) {
		if (progress != line.progress_percentage) {
			frappe.model.set_value(line.doctype, line.name, "progress_percentage", progress)
		}


		const soi = await frappe.db.get_value("Sales Order Item", line.so_detail, ["qty", "base_net_amount", "billed_amt"], null, "Sales Order")
		const already_billed = flt(soi.message.billed_amt) / flt(soi.message.base_net_amount) * 100.0
		const calculated_qty = (flt(progress) - flt(already_billed)) / 100.0 * flt(soi.message.qty)

		if (calculated_qty && calculated_qty != line.qty) {
			frappe.model.set_value(line.doctype, line.name, "qty", calculated_qty).then(() => frm.cscript.calculate_taxes_and_totals())
		}
	}
}


const calculate_progress_from_qty = async(frm, line) => {
	if (line.sales_order && line.so_detail && ["item", ""].includes(line.row_type)) {

		const soi = await frappe.db.get_value("Sales Order Item", line.so_detail, ["qty", "base_net_amount", "billed_amt"], null, "Sales Order")
		const already_billed = flt(soi.message.billed_amt) / flt(soi.message.base_net_amount)
		const calculated_progress = (flt(line.qty) / flt(soi.message.qty) + flt(already_billed, 2)) * 100.0

		if (calculated_progress && calculated_progress != line.progress_percentage) {
			frm.dont_calculate_progress = true;
			frappe.model.set_value(line.doctype, line.name, "progress_percentage", calculated_progress).then(() => {
				frm.dont_calculate_progress = false
				frm.cscript.calculate_taxes_and_totals();
			})
		}
	}
}

const calculate_total_progress = async(frm) => {
	let base_net_amount = 0.0
	let billed_amt = 0.0
	for await (const result of frm.doc.items.map(async item => {
		const soi = await frappe.db.get_value("Sales Order Item", item.so_detail, ["base_net_amount", "billed_amt"], null, "Sales Order")
		return soi.message
	})) {
		base_net_amount += result.base_net_amount
		billed_amt += result.billed_amt
	}

	const progress_prct = (flt(frm.doc.base_net_total) + billed_amt) / base_net_amount * 100.0
	if (flt(progress_prct) != flt(frm.doc.progress_percentage)) {
		frm.set_value("progress_percentage", progress_prct)
	}
}
