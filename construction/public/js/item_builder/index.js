import ItemBuilderTable from "./table";
import ItemBuilderTree from "./tree";

frappe.provide("construction")

construction.item_builder = class ItemBuilder {
	constructor(opts) {
		Object.assign(this, opts)

		this.current_view = "Table"
		this.show()
	}

	show() {
		this.$wrapper.empty()
		this.$header = $(`<div class="item-builder-header d-flex flex-row-reverse">
			<button class="btn btn-default">${frappe.utils.icon('list', 'sm')}</button>
		</div>`).appendTo(this.$wrapper)
		this.$tree_wrapper = $(`<div class="item-builder-tree"><div class="tree"></div></div>`).appendTo(this.$wrapper)
		console.log(this.$tree_wrapper)

		this.$table_wrapper = $(`<div class="item-builder-table"><div class="tabulator-table"></div></div>`).appendTo(this.$wrapper)

		this.make()

		this.$tree_wrapper.hide()
	}

	make() {
		this.tree = new ItemBuilderTree(this)
		this.table = new ItemBuilderTable(this)

		this.$header.find(".btn").on("click", () => {
			if (this.current_view == "Table") {
				this.$tree_wrapper.show()
				this.$table_wrapper.hide()
				this.$header.find(".btn").html(frappe.utils.icon('table', 'sm'))
				this.current_view = "Tree"
			} else {
				this.$tree_wrapper.hide()
				this.$table_wrapper.show()
				this.$header.find(".btn").html(frappe.utils.icon('list', 'sm'))
				this.current_view = "Table"
			}
		})
	}
}