import ItemBuilderTable from "./table";
import ItemBuilderTree from "./tree";

frappe.provide("construction")

construction.item_builder = class ItemBuilder {
	constructor(opts) {
		Object.assign(this, opts);

		if (frappe.boot.use_table_view) {
			this.set_current_view("Table");
		} else {
			this.set_current_view("None");
		}
	}

	set_current_view(view) {
		this.current_view = view;
		this.show();
	}

	destroy() {
		this.$wrapper.empty();

		this.$table_wrapper?.remove();
		this.$table_wrapper = null;
		this.table?.destroy?.();
		this.table = null;

		this.$tree_wrapper?.remove();
		this.$tree_wrapper = null;
		this.tree?.destroy?.();
		this.tree = null;
	}

	show() {
		this.destroy();

		this.$header = $(`<div class="item-builder-header d-flex flex-row-reverse">`).appendTo(this.$wrapper);

		// this.$btn_switch_view = $(`<button class="btn btn-default">${frappe.utils.icon('list', 'sm')}</button>`).appendTo(this.$header);
		// this.$btn_switch_view.on("click", () => {
		// 	if (this.current_view == "Table") {
		// 		this.set_current_view("Tree");
		// 	} else {
		// 		this.set_current_view("Table");
		// 	}
		// });

		if (this.current_view == "Table") {
			this.$table_wrapper = $(`<div class="item-builder-table"><div class="tabulator-table"></div></div>`).appendTo(this.$wrapper);
			this.table = new ItemBuilderTable(this);
			// this.$btn_switch_view.html(frappe.utils.icon('list', 'sm'));
		} else if (this.current_view == "Tree") {
			this.$tree_wrapper = $(`<div class="item-builder-tree"><div class="tree"></div></div>`).appendTo(this.$wrapper);
			this.tree = new ItemBuilderTree(this);
			// this.$btn_switch_view.html(frappe.utils.icon('table', 'sm'));
		} else {
			this.hide();
		}
	}

	hide() {
		this.$wrapper.empty();
	}
}