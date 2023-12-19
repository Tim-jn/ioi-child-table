# Copyright (c) 2023, Dokos SAS and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ConstructionAppSettings(Document):
	def clear_cache(self):
		frappe.cache_manager.clear_user_cache()
		return super().clear_cache()
