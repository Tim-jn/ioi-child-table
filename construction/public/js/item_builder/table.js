import { TabulatorFull as Tabulator } from "tabulator-tables";

const TABLE_COLUMNS = [
	"qty",
	"item_code",
	"item_name",
	"description",
	"height",
	"width",
	"uom",
	"unit_cost_price",
	"cost_price",
	"rate",
	"amount",
]

export default class ItemBuilderTable {
	constructor(opts) {
		Object.assign(this, opts)

		this.build_table()

		this.$table_footer = $(`<div class="item-table-footer d-flex flex-row-reverse">
			<button class="btn btn-default new-text">${__("New comment")} ${frappe.utils.icon('add', 'sm')}</button>
			<button class="btn btn-default new-title mr-2">${__("New title")} ${frappe.utils.icon('add', 'sm')}</button>
			<button class="btn btn-primary new-item mr-2">${__("New item")} ${frappe.utils.icon('add', 'sm')}</button>
			<button class="btn btn-danger delete-row mr-2" style="display: none;">${__("Delete")} ${frappe.utils.icon('remove', 'sm')}</button>
		</div>`).appendTo(this.$table_wrapper)

		this.bind_events()
	}

	build_table() {
		this.get_columns()
		this.table_data = this.frm.doc.items;
		const tabulator_options = {
			data: this.table_data,
			columns: this.columns,
			minHeight: 100,
			debugInvalidOptions: false,
			resizableRows: true,
			reactiveData:true,
			movableRows: true,
		}

		this.table = new Tabulator(this.$table_wrapper.find(".tabulator-table")[0], tabulator_options);
	}

	get_columns() {
		const meta = frappe.get_meta("Quotation Item")

		let sort_keys = TABLE_COLUMNS
		const filtered_fields = meta.fields
			.filter(f => {
				return sort_keys.includes(f.fieldname) || f.in_list_view
			})
		filtered_fields.forEach(f => {
			if (!sort_keys.includes(f.fieldname)) {
				sort_keys.push(f.fieldname)
			}
		})

		const sorted_fields = filtered_fields.sort(function(a, b){
				return sort_keys.indexOf(a.fieldname) - sort_keys.indexOf(b.fieldname)
			})

		this.columns = sorted_fields.map((col) => {
				const mapped_column = {
					title: __(col.label) || "",
					field: col.fieldname,
					editor: true
				}

				if (col.fieldname == "item_code") {
					get_item_code_column(mapped_column, col)
				} else if  (col.fieldname == "description") {
					get_description_column(mapped_column)
				}

				return mapped_column;
			});

		this.columns.unshift(
			{
				title: __("Row Type"),
				field: "row_type",
				editor: false,
				visible: false
			},
		)

		this.columns.unshift(
			{
				title: __("Row Name"),
				field: "name",
				editor: false,
				visible: false
			},
		)

		this.columns.unshift(
			{
				formatter: "rowSelection",
				titleFormatter: "rowSelection",
				hozAlign: "center",
				headerSort: false,
				cellClick: function(e, cell){
					cell.getRow().toggleSelect();
				}
			},
		)
	}

	bind_events() {
		const me = this;
		this.$new_item_button = this.$table_footer.find(".new-item")
		this.$delete_row_button = this.$table_footer.find(".delete-row")
		this.$new_title_button = this.$table_footer.find(".new-title")
		this.$new_text_button = this.$table_footer.find(".new-text")

		this.$new_item_button.on("click", () => {
			this.frm.add_child("items", {
				"row_type": "item"
			})
			this.frm.refresh_fields("items");
		})

		this.$new_title_button.on("click", () => {
			this.show_text_title_dialog("title")
		})

		this.$new_text_button.on("click", () => {
			this.show_text_title_dialog("text")
		})

		this.$delete_row_button.on("click", () => {
			const selected_rows = this.table.getSelectedRows()
			selected_rows.forEach((row) => {
				console.log("ROW", row)
				const rowData = row.getData();

				if (rowData.name) {
					this.frm.fields_dict.items.grid.grid_rows_by_docname[rowData.name].remove()
					this.frm.refresh()
				}
			})
		})

		const toggle_delete_row_button = () => {
			if (this.table.getSelectedRows().length) {
				this.$delete_row_button.show()
			} else {
				this.$delete_row_button.hide()
			}
		}

		this.table.on("rowSelected", function() {
			toggle_delete_row_button()
		});

		this.table.on("rowDeselected", function() {
			toggle_delete_row_button()
		});

		this.table.on("cellEdited", function(cell){
			me.sync_item_cell(cell)
		});
	}

	show_text_title_dialog(row_type) {
		const me = this;
		const title = row_type == "text" ? __("Add Comment") : __("Add Title");
		const dialog = new frappe.ui.Dialog({
			title: __('Update Cost Center Name / Number'),
			fields: [
				{
					"label": "Title Level",
					"fieldname": "title_level",
					"fieldtype": "Select",
					"reqd": row_type == "title",
					"options": [
						{
							label: "Title 1",
							value: "title1"
						},
						{
							label: "Title 2",
							value: "title2"
						},
						{
							label: "Title 3",
							value: "title3"
						}
					],
					"default": "title1",
					"hidden": row_type == "text"
				},
				{
					"label": __("Title"),
					"fieldname": "title",
					"fieldtype": "Data",
					"reqd": row_type == "title",
					"hidden": row_type == "text"
				},
				{
					"label": __("Comment"),
					"fieldname": "comment",
					"fieldtype": "Text Editor",
					"reqd": row_type == "text",
					"hidden": row_type == "title"
				}
			],
			primary_action: function() {
				const values = dialog.get_values()
				let content = row_type == "text" ? values.comment : values.title

				if (row_type == "title") {
					switch (values.title_level) {
						case "title1":
							content = `<div class="ql-editor read-mode"><h1>${values.title}</h1></div>`
						case "title2":
							content =  `<div class="ql-editor read-mode"><h2>${values.title}</h2></div>`
						case "title3":
							content =  `<div class="ql-editor read-mode"><h3>${values.title}</h3></div>`
					}
				}
				me.frm.add_child("items", {
					"row_type": row_type == "text" ? "text" : values.title_level,
					"description": content
				})
				me.frm.refresh_fields("items");

				dialog.hide()
			},
			primary_action_label: title
		});
		dialog.show();
	}

	sync_item_cell(cell) {
		const row = cell.getRow();
		const rowData = row.getData();

		if (rowData.name) {
			frappe.model.set_value(rowData.doctype, rowData.name, cell.getField(), cell.getValue());
			this.frm.refresh_fields("items");
			this.frm.dirty();
		}
	}
}

// Create an item catalog
const get_item_code_column = (mapped_column, col) => {
	mapped_column["editor"] = "list"
	mapped_column["editorParams"] = {
		autocomplete: true,
		placeholderLoading: __("Loading..."),
		placeholderEmpty: __("No Result"),
		valuesLookup: function (cell, filterTerm) {
			const args = {
				txt: filterTerm,
				doctype: col.options,
				ignore_user_permissions: false,
				reference_doctype: "Quotation",
			};
			const values = new Promise((resolve, reject) => {
				return frappe
					.call({
						type: "POST",
						method: "frappe.desk.search.search_link",
						no_spinner: true,
						args: args,
					})
					.then((r) => {
						resolve(
							r.message.map((res) => {
								return Object.assign(res, { label: res.value });
							})
						);
					});
			});
			return values;
		},
		filterRemote: true,
		listOnEmpty: true,
		allowEmpty: true,
		clearable: true,
	};
}

const get_description_column = (mapped_column) => {
	mapped_column["editor"] = false;
	mapped_column["formatter"] = "html";
}