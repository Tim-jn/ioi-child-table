// Copyright (c) 2023, Dokos SAS and contributors
// For license information, please see license.txt

frappe.query_reports["Sales Margin Comparison"] = {
	"filters": [
		{
			fieldname: "company",
			label: __("Company"),
			fieldtype: "Link",
			options: "Company",
			default: frappe.defaults.get_user_default("Company"),
			reqd: 1
		},
		{
			fieldname: "quotation",
			label: __("Quotation"),
			fieldtype: "Link",
			options: "Quotation",
		},
	]
};
