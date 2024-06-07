from erpnext.stock.doctype.delivery_note.delivery_note import DeliveryNote

from construction.overrides.status_updater import add_row_type_condition_to_status_updater

class ConstructionDeliveryNote(DeliveryNote):
	def __init__(self, *args, **kwargs):
		super().__init__(*args, **kwargs)
		self.status_updater = add_row_type_condition_to_status_updater(self.status_updater)