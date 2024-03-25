import ItemBuilderTable from "./table";
import ItemBuilderTree from "./tree";

frappe.provide("construction");

construction.ItemCatalog = class ConstructionItemCatalog extends erpnext.ItemCatalog {
	/**
	 * @override
	 * @returns {jQuery}
	 */
	async make_button() {
		const item_builder = this.opts.item_builder;
		if (item_builder) {
			const $btn = $(`<button class="btn btn-default btn-xs mr-2">`);
			$btn.html(frappe.utils.icon("es-line-table-view", "sm"));
			$btn.append(" " + __("Catalog"));
			$btn.on("click", () => this.show_catalog())

			if (item_builder.table) {
				await item_builder.table.ready_promise;
				const del_btn = item_builder.table.$table_buttons.find(".btn").get(0);
				$btn.insertAfter(del_btn);
			} else {
				item_builder.$header.append($btn);
			}
			this.$btn = $btn;
		} else {
			return super.make_button();
		}
	}

	show_button() {
		this.$btn?.remove();
		this.$btn = null;
		return super.show_button();
	}
}

construction.item_builder = class ItemBuilder {
	constructor(opts) {
		Object.assign(this, opts);

		if (frappe.boot.use_table_view) {
			this.set_current_view("Table");
		} else {
			this.set_current_view("None");
		}
	}

	async setup_item_catalog() {
		const has_items_field = frappe.meta.get_docfield(this.frm.doc.doctype + " Item", "item_code");
		const read_only = this.frm.read_only || this.frm.doc.docstatus > 0;
		if (has_items_field && !read_only) {
			if (!this.item_catalog) {
				this.item_catalog = new construction.ItemCatalog({ frm: this.frm, item_builder: this });
			}
			await this.item_catalog.show_button();
		} else {
			await this.item_catalog?.hide_button();
		}
	}

	set_current_view(view) {
		this.current_view = view;
		this.show();
		this.setup_item_catalog();
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

construction.setup_quotation_builder = (frm) => {
	const field = frm.get_field("item_builder_html");
	const $wrapper = field?.$wrapper;
	if (!$wrapper) {
		return console.error("construction: Wrapper not found for item builder in form:", frm);
	}
	frm.item_builder?.destroy(); // cleanup from previous render
	frm.item_builder = new construction.item_builder({ frm, $wrapper });
};
