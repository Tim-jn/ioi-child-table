from typing import TYPE_CHECKING

import frappe

if TYPE_CHECKING:
	from construction.construction.doctype.construction_app_settings.construction_app_settings import (
		ConstructionAppSettings,
	)


def get_bootinfo(bootinfo):
	settings: "ConstructionAppSettings" = frappe.get_single("Construction App Settings")  # type: ignore
	bootinfo.use_table_view = settings.use_table_view  # DEPRECATED
	bootinfo.construction_app_settings = {
		"use_table_view": settings.use_table_view,
		"allow_buying": settings.allow_buying,
		"allow_selling": settings.allow_selling,
		"default_table_page_size": settings.default_table_page_size,
		"disable_title_counters": settings.disable_title_counters,
	}
