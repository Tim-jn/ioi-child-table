import frappe

from frappe.utils import flt
from frappe.tests.utils import FrappeTestCase

from erpnext.selling.doctype.sales_order.test_sales_order import make_sales_order
from erpnext.selling.doctype.sales_order.sales_order import make_sales_invoice
from erpnext.controllers.accounts_controller import InvalidQtyError

from construction.overrides.sales_order import make_progress_invoice
from construction.overrides.sales_invoice import InvalidProgressCalculationMethodError

test_dependencies = ["Customer", "Sales Invoice"]

class TestProgressInvoice(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		if not frappe.flags.args:
			frappe.flags.args = frappe._dict(progress_percentage=0.0)

		frappe.db.set_value(
			"Company",
			"_Test Company",
			"default_advance_received_account",
			"_Test Down Payment - _TC",
		)


	@staticmethod
	def create_sales_order():
		sales_order = make_sales_order(do_not_save=True)

		item_line = frappe.copy_doc(sales_order.items[0])
		sales_order.append("items", item_line)

		sales_order.insert()
		sales_order.submit()

		return sales_order


	def test_invoice_from_sales_order(self):
		sales_order = self.create_sales_order()

		self.assertEqual(sales_order.grand_total, 2000.0)

		frappe.flags.args.progress_percentage = 50.0
		sales_invoice = make_progress_invoice(sales_order.name)

		self.assertEqual(sales_invoice.grand_total, 1000.0)
		self.assertEqual(sales_invoice.progress_percentage, 50.0)
		self.assertEqual(sales_invoice.progress_invoice_no, 1)

		sales_invoice.submit()
		self.assertEqual(sales_invoice.grand_total, 1000.0)
		self.assertEqual(sales_invoice.progress_percentage, 50.0)
		self.assertEqual(sales_invoice.progress_invoice_no, 1)

		frappe.flags.args.progress_percentage = 30.0
		sales_invoice = make_progress_invoice(sales_order.name)


		self.assertRaises(InvalidQtyError, sales_invoice.submit)

		frappe.flags.args.progress_percentage = 80.0
		sales_invoice = make_progress_invoice(sales_order.name)

		sales_invoice.submit()
		self.assertEqual(sales_invoice.grand_total, 600.0)
		self.assertEqual(sales_invoice.progress_percentage, 80.0)
		self.assertEqual(sales_invoice.progress_invoice_no, 2)


		frappe.flags.args.progress_percentage = 100.0
		sales_invoice = make_progress_invoice(sales_order.name)
		sales_invoice.insert()
		sales_invoice.submit()
		self.assertEqual(sales_invoice.grand_total, 400.0)
		self.assertEqual(sales_invoice.progress_percentage, 100.0)
		self.assertEqual(sales_invoice.progress_invoice_no, 3)

	def test_progress_by_line_item(self):
		sales_order = self.create_sales_order()

		self.assertEqual(sales_order.grand_total, 2000.0)

		frappe.flags.args.progress_percentage = 50.0
		sales_invoice = make_progress_invoice(sales_order.name)
		sales_invoice.items[0].progress_percentage = 65
		sales_invoice.items[1].progress_percentage = 48
		sales_invoice.calculate_progress_globally = False
		sales_invoice.save()

		self.assertEqual(sales_invoice.items[0].progress_percentage, 65.0)
		self.assertEqual(sales_invoice.items[0].qty, 6.5)
		self.assertEqual(sales_invoice.items[1].progress_percentage, 48.0)
		self.assertEqual(sales_invoice.items[1].qty, 4.8)
		self.assertEqual(flt(sales_invoice.progress_percentage, 2), 56.50)

		sales_invoice.calculate_progress_globally = True
		sales_invoice.progress_percentage = 50.0
		sales_invoice.save()

		self.assertEqual(sales_invoice.items[0].progress_percentage, 50.0)
		self.assertEqual(sales_invoice.items[1].progress_percentage, 50.0)
		self.assertEqual(sales_invoice.progress_percentage, 50.0)


	def test_progress_invoice_after_down_payment(self):
		sales_order = self.create_sales_order()

		self.assertEqual(sales_order.grand_total, 2000.0)

		dp_invoice = make_down_payment_invoice(sales_order)

		frappe.flags.args.progress_percentage = 50.0
		sales_invoice = make_progress_invoice(sales_order.name)
		sales_invoice.submit()

		self.assertEqual(sales_invoice.grand_total, 1000.0)
		self.assertEqual(sales_invoice.progress_percentage, 50.0)
		self.assertEqual(sales_invoice.progress_invoice_no, 1)

		frappe.flags.args.progress_percentage = 80.0
		sales_invoice = make_progress_invoice(sales_order.name)

		sales_invoice.submit()
		self.assertEqual(sales_invoice.grand_total, 600.0)
		self.assertEqual(sales_invoice.progress_percentage, 80.0)
		self.assertEqual(sales_invoice.progress_invoice_no, 2)

	def test_progress_while_removing_one_line_item(self):
		sales_order = self.create_sales_order()

		frappe.flags.args.progress_percentage = 50.0
		sales_invoice = make_progress_invoice(sales_order.name)
		sales_invoice.remove(sales_invoice.items[1])
		sales_invoice.items[0].progress_percentage = 65
		sales_invoice.calculate_progress_globally = False
		sales_invoice.save()

		self.assertEqual(sales_invoice.items[0].progress_percentage, 65.0)
		self.assertEqual(sales_invoice.items[0].qty, 6.5)
		self.assertEqual(flt(sales_invoice.progress_percentage, 2), 32.50)

		sales_invoice.calculate_progress_globally = True
		sales_invoice.progress_percentage = 50.0
		
		self.assertRaises(InvalidProgressCalculationMethodError, sales_invoice.save)

	def test_progress_while_adding_a_comment(self):
		sales_order = self.create_sales_order()

		frappe.flags.args.progress_percentage = 50.0
		sales_invoice = make_progress_invoice(sales_order.name)
		sales_invoice.append("items", {
			"row_type": "text",
			"description": "This is a comment",
			"item_name": "This is a comment",
			"qty": 1
		})
		sales_invoice.save()



def make_down_payment_invoice(sales_order):
	dp_item = frappe.db.get_value("Item", dict(is_down_payment_item=1, disabled=0))
	down_payment_percentage = 30.0

	si = make_sales_invoice(sales_order.name, ignore_permissions=True)
	si.is_down_payment_invoice = True
	si.items = []
	si.append(
		"items",
		{
			"item_code": dp_item,
			"qty": 1,
			"rate": flt(down_payment_percentage) / 100.0 * flt(sales_order.total),
			"price_list_rate": flt(down_payment_percentage) / 100.0 * flt(sales_order.base_total),
			"base_rate": flt(down_payment_percentage) / 100.0 * flt(sales_order.total),
			"sales_order": sales_order.name,
			"down_payment_percentage": down_payment_percentage
		},
	)
	si.run_method("set_missing_values")
	si.insert(ignore_permissions=True)
	si.submit()

	return si