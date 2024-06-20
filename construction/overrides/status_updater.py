def add_row_type_condition_to_status_updater(status_updater):
	updated_status_updater = status_updater.copy()
	for updater in updated_status_updater:
		if target_dt := updater.get("target_dt"):
			# Only the following item doctypes have the row_type field.
			if target_dt in (
				"Quotation Item",
				"Sales Order Item",
				"Sales Invoice Item",
				"Delivery Note Item",
			):
				updater["target_dt_condition"] = "and COALESCE(row_type, '') in ('', 'item')"

	return updated_status_updater
