def add_row_type_condition_to_status_updater(status_updater):
	updated_status_updater = status_updater.copy()
	for updater in updated_status_updater:
		if updater.get("target_parent_dt") and updater.get("target_parent_dt") != "Material Request":
			updater["target_dt_condition"] = "and COALESCE(row_type, '') in ('', 'item')"

	return updated_status_updater