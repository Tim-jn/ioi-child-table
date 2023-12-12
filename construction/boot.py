import frappe

def get_bootinfo(bootinfo):
	bootinfo.use_table_view = frappe.db.get_single_value("Construction App Settings", "use_table_view")