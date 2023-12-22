// Copyright (c) 2023, Dokos SAS and contributors
// For license information, please see license.txt

frappe.query_reports["Sales Margin Comparison"] = {
	"filters": [
		{
			fieldname: "quotation",
			label: __("Quotation"),
			fieldtype: "Link",
			options: "Quotation",
		},
	]
};
