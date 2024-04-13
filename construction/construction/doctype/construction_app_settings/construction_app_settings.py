# Copyright (c) 2023, Dokos SAS and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ConstructionAppSettings(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		from construction.construction.doctype.construction_quotation_builder_column.construction_quotation_builder_column import (
			ConstructionQuotationBuilderColumn,
		)

		allow_buying: DF.Check
		allow_selling: DF.Check
		quotation_builder_columns: DF.Table[ConstructionQuotationBuilderColumn]
		use_table_view: DF.Check
	# end: auto-generated types

	def clear_cache(self):
		frappe.cache_manager.clear_user_cache()
		return super().clear_cache()
