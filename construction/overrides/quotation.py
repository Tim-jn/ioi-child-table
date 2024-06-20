from erpnext.selling.doctype.quotation.quotation import Quotation

# from construction.overrides.status_updater import add_row_type_condition_to_status_updater


def is_not_text_item(row):
	return (row.get("row_type") or "") in ("", "item")


class ConstructionQuotation(Quotation):
	def get_ordered_status(self):
		from unittest.mock import patch

		mock_items = self.items and list(filter(is_not_text_item, self.items))
		with patch.object(self, "items", new=mock_items):
			return super().get_ordered_status()
