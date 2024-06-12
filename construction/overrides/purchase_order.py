
from erpnext.buying.doctype.purchase_order.purchase_order import PurchaseOrder
from construction.overrides.status_updater import add_row_type_condition_to_status_updater

class ConstructionPurchaseOrder(PurchaseOrder):
	def __init__(self, *args, **kwargs):
		super().__init__(*args, **kwargs)
		self.status_updater = add_row_type_condition_to_status_updater(self.status_updater)