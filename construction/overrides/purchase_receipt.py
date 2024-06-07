
from erpnext.stock.doctype.purchase_receipt.purchase_receipt import PurchaseReceipt
from construction.overrides.status_updater import add_row_type_condition_to_status_updater

class ConstructionPurchaseReceipt(PurchaseReceipt):
	pass
	# def __init__(self, *args, **kwargs):
	# 	super().__init__(*args, **kwargs)
	# 	self.status_updater = add_row_type_condition_to_status_updater(self.status_updater)