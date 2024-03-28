// Copyright (c) 2024, Dokos SAS and contributors
// For license information, please see license.txt

frappe.query_reports["Quotation Markup by Project"] = {
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
			fieldname: "project",
			label: __("Project"),
			fieldtype: "Link",
			options: "Project",
			get_query: () => {
				var company = frappe.query_report.get_filter_value('company');
				return {
					filters: {
						'company': ["in", [company, ""]]
					}
				}
			}
		},
		{
			fieldname: "expected_start_date",
			label: __("Projects expected to start after"),
			fieldtype: "Date",
		},
		{
			fieldname: "expected_end_date",
			label: __("Projects expected to end after"),
			fieldtype: "Date",
		},
	]
};
