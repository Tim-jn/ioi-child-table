import { TabulatorFull as Tabulator } from "tabulator-tables";

const TABLE_COLUMNS = [
	"item_code",
	"item_name",
	"qty",
	"description",
	"uom",
	"last_purchase_rate",
	"gross_profit_percentage",
	"rate",
	"amount",
	"row_print_style",
];

function frappeTabulatorCellEditor(cell, onRendered, success, cancel, editorParams) {
	// cell - the cell component for the editable cell
	// onRendered - function to call when the editor has been rendered
	// success - function to call to pass thesuccessfully updated value to Tabulator
	// cancel - function to call to abort the edit and return to a normal cell
	// editorParams - params object passed into the editorParams column definition property

	const el = document.createElement("div");
	const cellElement = cell.getElement();
	cellElement.style.overflow = "visible";
	const initialValue = cell.getValue();
	let updatedValue = initialValue;

	const control = frappe.ui.form.make_control({
		df: {
			...editorParams.df,
			onchange: () => {
				const value = control.get_value();
				if (value !== updatedValue) {
					success(value);
				}
			},
		},
		parent: el,
		render_input: true,
		only_input: true,
		layout: { grid: {} },
		value: initialValue,
	});

	// Call cancel() on blur
	$(control.$input || control.input || control.input_area).on("focusout", () => {
		cancel();
	});

	onRendered(() => {
		control.set_focus();
	});

	return el;
}

function frappeTabulatorCellFormatter(cell, formatterParams, onRendered) {
	const value = cell.getValue();
	const doc = cell.getRow().getData();
	const html = frappe.format(value, formatterParams.df, null, doc);
	const parsed = new DOMParser().parseFromString(html, "text/html");
	parsed.querySelectorAll("a").forEach((el) => {
		el.removeAttribute("href");
		el.removeAttribute("target");
		el.type = "span";
	});
	return parsed.body.innerHTML;
}


class ItemBuilderForm {
	constructor(frm) {
		this.frm = frm;
	}

	assert(condition, message) {
		if (!condition) {
			throw message || "Assertion failed";
		}
	}

	get_rows() {
		return this.frm.doc.items;
		// return JSON.parse(JSON.stringify(this.frm.doc.items));
	}

	get_columns() {
		const meta = frappe.get_meta(this.row_doctype);
		const order = TABLE_COLUMNS.slice();

		// Keep the fields that are in the TABLE_COLUMNS list, or those visible in the list view (-> grid).
		const fields = meta.fields.filter(df => {
			return order.includes(df.fieldname) || df.in_list_view
		});

		// Append unsorted fields to the end of the list.
		fields.forEach((df) => {
			if (!order.includes(df.fieldname)) {
				order.push(df.fieldname);
			}
		});

		const sorter = (a, b) => order.indexOf(a.fieldname) - order.indexOf(b.fieldname);
		fields.sort(sorter); // sort in place

		const columns = [
			{
				rowHandle: true,
				formatter: "handle",
				headerSort: false,
				frozen: true,
				width: 30,
				minWidth: 30,
			},
			{
				formatter: "rowSelection",
				titleFormatter: "rowSelection",
				hozAlign: "center",
				headerSort: false,
				cellClick(e, cell) {
					cell.getRow().toggleSelect()
				},
			},
			{
				title: "",
				field: "edit_btn",
				editor: false,
				headerSort: false,
				formatter: (cell, formatterParams, onRendered) => {
					const click = () => {
						const row = cell.getRow();
						const rowData = row.getData();
						const doc = this.frm.doc.items.find(x => x.name === rowData.name);

						const dialog = new frappe.ui.Dialog({
							size: "large",
							fields: frappe.get_meta("Quotation Item").fields,
							frm: this.frm,
							grid: this.frm.grids[0].grid,
							title: __("Edit"),
							primary_action_label: __("Close"),
							primary_action: () => {
								dialog.hide();
							},
							onhide: () => {
								this.open_form = null;
							},
						});
						dialog.refresh(doc);
						dialog.show();
						this.open_form = dialog;
					}
					const button = document.createElement("button");
					button.classList.add("btn-reset");
					button.innerHTML = frappe.utils.icon("edit", "sm");
					button.ariaLabel = __("Edit");
					button.addEventListener("click", click);
					return button;
				},
			},
			{
				title: __("Row Type"),
				field: "row_type",
				editor: false,
				visible: false,
				headerSort: false,
			},
			{
				title: __("Row Name"),
				field: "name",
				editor: false,
				visible: false,
				headerSort: false,
			},
		];

		// Then, append the sorted fields to the columns list.
		for (const df of fields) {
			const col = {
				title: __(df.label) || "",
				field: df.fieldname,
				editor: true,
				headerSort: false,
			}

			if (df.fieldname == "description") {
				col.editor = frappeTabulatorCellEditor;
				col.editorParams = {
					df: { ...df, theme: "bubble" },
				};
				col.formatter = "html";
			} else {
				if (!df.read_only) {
					col.editor = frappeTabulatorCellEditor;
					col.editorParams = { df };
				} else {
					col.editor = false;
				}
				col.formatter = frappeTabulatorCellFormatter;
				col.formatterParams = { df };
			}

			columns.push(col);
		}

		return columns;
	}

	get_grid() {
		return this.frm.get_field("items").grid;
	}

	append_row(values) {
		// idx, callback, show, copy_doc, go_to_last_page = false, go_to_first_page = false
		this.get_grid().add_new_row(null, null, null, values, false, false);

		// https://frappeframework.com/docs/user/en/api/form#frm-add-child
		// this.frm.add_child("items", values);
		// this.frm.refresh_fields("items");
	}

	update_row_value(doc, key, value) {
		this.assert(doc.name, "Row doc.name is required")
		// Because Tabulator will update the value directly in the row object, we need to delete the key first.
		// This is assumed to be done by the calling function itself.
		// doc[key] = previousValue;
		frappe.model.set_value(doc.doctype, doc.name, key, value);

		// this.get_grid().get_row(String(doc.name)).refresh_field(key);
		// this.frm.refresh_fields("items");
		// this.frm.dirty();
	}

	remove_row(name) {
		this.get_grid().get_row(String(name)).remove();
		// this.frm.refresh();
	}

	move_rows(/** @type {string[]} */ names, /** @type {number} */ targetIndex) {
		if (!Number.isInteger(targetIndex)) {
			throw new Error("Item Builder move_rows: `targetIndex` must be an integer");
		}
		const grid = this.get_grid();

		/** @type {unknown[]} */
		const data = grid.get_data();

		for (const name of names) {
			const oldIndex = data.findIndex(row => row.name == name);
			const newIndex = targetIndex;
			// Remove 1 row at the old index
			const removed = data.splice(oldIndex, 1);
			// Insert it at the new index
			data.splice(newIndex, 0, ...removed);
		}

		// renum idx
		for (let i = 0; i < data.length; i++) {
			data[i].idx = i + 1;
		}

		grid.refresh();
		this.frm.dirty();
		// $(this.frm.wrapper).trigger("grid-move-row", [this.frm, row]);
	}

	can_skip_refresh(fieldname, value, rowDoc) {
		// if (value?.startsWith?.("<div class=\"ql-editor")) {
		// 	return true;
		// }
	}

	watch_update(fn) {
		const throttled = frappe.utils.throttle(fn, 16, { leading: true, trailing: true });
		// const watchModel = frappe.model.on.bind(frappe.model);
		const watchModel = (dt, fi, fn) => {
			frappe.model.on(dt, fi, (...args) => {
				if (this.can_skip_refresh(...args)) return;
				fn(...args);
			});
		}

		const parent = this.parent_doctype;
		const child = this.row_doctype;

		watchModel(parent, "refresh", throttled);
		watchModel(child, "*", throttled);

		frappe.ui.form.on(child, "items_move", throttled);
		frappe.ui.form.on(child, "items_add", throttled);
		frappe.ui.form.on(child, "items_remove", throttled);
		frappe.ui.form.on(child, "items_delete", throttled);
	}

	get parent_doctype() { return this.frm.doctype; }
	get row_doctype() { return frappe.meta.get_field(this.parent_doctype, "items").options; }
}

export default class ItemBuilderTable {
	constructor(opts) {
		Object.assign(this, opts)

		this.frm = opts.frm;
		this.form_wrapper = new ItemBuilderForm(this.frm);

		this.build_table()

		this.$table_footer = $(`<div class="item-table-footer d-flex flex-row-reverse">
			<button class="btn btn-default new-text">${__("Add Comment", null, "Construction")} ${frappe.utils.icon('add', 'sm')}</button>
			<button class="btn btn-default new-title mr-2">${__("Add Title", null, "Construction")} ${frappe.utils.icon('add', 'sm')}</button>
			<button class="btn btn-primary new-item mr-2">${__("Add Item", null, "Construction")} ${frappe.utils.icon('add', 'sm')}</button>
			<button class="btn btn-danger delete-row mr-2" style="display: none;">${__("Delete")} ${frappe.utils.icon('remove', 'sm')}</button>
		</div>`).appendTo(this.$table_wrapper)

		this.bind_events()
		this.bind_form()
	}

	bind_form() {
		this.form_wrapper.watch_update(async () => {
			const newRows = this.form_wrapper.get_rows();
			const oldRows = this.tabulator.getData();
			const deletedRows = oldRows.filter(x => !newRows.find(y => y.name === x.name));

			if (deletedRows.length) {
				this.tabulator.deleteRow(deletedRows.map(x => x.name));
			}
			if (newRows.length) {
				await this.tabulator.updateOrAddData(newRows);
			}

			if (this.form_wrapper.open_form) {
				const dialog = this.form_wrapper.open_form;
				const item = this.frm.doc.items.find(x => x.name === dialog.doc.name)
				if (item) {
					dialog.refresh(item);
				}
			}
		});
	}

	build_table() {
		const tabulator_options = {
			data: this.form_wrapper.get_rows(),
			columns: this.form_wrapper.get_columns(),
			minHeight: 256,
			debugInvalidOptions: true,
			resizableRows: false,
			reactiveData: false,
			movableRows: true,
			rowFormatter: this.rowFormatter.bind(this),
		}

		this.tabulator = new Tabulator(this.$table_wrapper.find(".tabulator-table")[0], tabulator_options);

		let lastScrollTop = 0;
		this.tabulator.on("renderStarted", () => {
			lastScrollTop = window.scrollY || lastScrollTop;
		});
		this.tabulator.on("renderComplete", () => {
			window.scrollTo(0, lastScrollTop);
		});
	}

	rowFormatter(row) {
		// https://tabulator.info/examples/5.5#nested-tables
		const doc = row.getData();

		if (doc?.row_type?.startsWith?.("title")) {
			this.rowFormatterForTitle(doc, row);
		} else if (doc?.row_type == "text") {
			this.rowFormatterForText(doc, row);
		}
	}

	makeCheckbox(doc, fieldname, label) {
		const checkboxWrapper = document.createElement("label");
		checkboxWrapper.classList.add("m-0");
		checkboxWrapper.innerHTML = `<div class="switch text-muted"><input type="checkbox"><span class="slider round"></span></div>`;
		const checkbox = checkboxWrapper.querySelector("input");
		checkbox.type = "checkbox";
		checkbox.checked = doc[fieldname];
		checkbox.addEventListener("change", (e) => {
			this.form_wrapper.update_row_value(doc, fieldname, e.target.checked);
		});
		checkboxWrapper.append("\xa0", label);
		return checkboxWrapper;
	}

	/* makeSelect(doc, df) {
		const selectWrapper = document.createElement("label");
		selectWrapper.classList.add("m-0");
		const control = frappe.ui.form.make_control({
			df: {
				...df,
				input_class: "input-xs",
				onchange: () => {
					const value = control.get_value();
					this.form_wrapper.update_row_value(doc, df.fieldname, value);
				},
			},
			parent: selectWrapper,
			render_input: true,
			only_input: true,
			value: doc[df.fieldname],
		});
		// selectWrapper.prepend(df.label, "\xa0");
		return selectWrapper;
	} */

	rowFormatterForTitle(doc, row) {
		const wrapper = this._buildWrapperInRow(row);

		// Parse title level
		const level = parseInt(doc.row_type.replace("title", ""));

		const header_wrapper = document.createElement("div");
		//header_wrapper.classList.add("d-flex");
		const element = document.createElement(`h${level + 1}`);
		header_wrapper.appendChild(element);
		wrapper.appendChild(header_wrapper);
		element.classList.add("m-0", "chantier-heading", "chantier-heading-" + level);

		// Add checkbox
		header_wrapper.appendChild(this.makeCheckbox(doc, "with_subtotal", __("Compute Subtotal")));
		// wrapper.appendChild(this.makeSelect(doc, {
		// 	...frappe.get_meta(this.form_wrapper.row_doctype).fields.find(x => x.fieldname === "row_print_style"),
		// 	label: __("Print Style"),
		// }));

		const counter = document.createElement("label");
		element.appendChild(counter);
		counter.classList.add("chantier-counter", "m-0");
		const select = document.createElement("select");
		for (let i = 1; i <= 3; i++) {
			const option = document.createElement("option");
			option.value = `title${i}`;
			const txt = `Heading ${i}`;
			option.text = __(txt) // "1.".repeat(i);
			if (i == level) {
				option.selected = true;
			}
			select.appendChild(option);
		}
		counter.appendChild(select);
		select.classList.add("btn-reset");
		select.addEventListener("change", () => {
			this.form_wrapper.update_row_value(doc, "row_type", select.value);
		});
		const icon = document.createElement("span");
		icon.innerHTML = frappe.utils.icon("es-line-select", "md");
		counter.appendChild(icon);

		const input = document.createElement("input");
		element.append(" ", input);
		input.classList.add("btn-reset");
		input.style.width = "60vw";
		input.style.font = "inherit";

		const KEY = "item_name";
		input.value = doc[KEY];
		input.addEventListener("change", (e) => {
			this.form_wrapper.update_row_value(doc, KEY, e.target.value);
		});
	}

	rowFormatterForText(doc, row) {
		const wrapper = this._buildWrapperInRow(row);
		const rowDt = this.form_wrapper.row_doctype;
		const rowDf = frappe.meta.get_docfield(rowDt, "description");
		const control = frappe.ui.form.make_control({
			df: {
				...rowDf,
				fieldtype: "Text Editor",
				max_height: 150,
				onchange: () => {
					const value = control.get_value();
					this.form_wrapper.update_row_value(doc, "description", value);
				},
			},
			parent: wrapper,
			render_input: true,
			only_input: true,
			value: doc.description,
		});
	}

	_buildWrapperInRow(row) {
		const wrapper = document.createElement("div");
		const rowEl = row.getElement();
		// Remove all children except the first two (drag handle and checkbox)
		while (rowEl.children.length > 2) {
			rowEl.removeChild(rowEl.lastChild);
		}
		rowEl.appendChild(wrapper);
		wrapper.classList.add("tabulator-cell");
		wrapper.style.width = "60vw";
		return wrapper;
	}

	bind_events() {
		this.$new_item_button = this.$table_footer.find(".new-item")
		this.$delete_row_button = this.$table_footer.find(".delete-row")
		this.$new_title_button = this.$table_footer.find(".new-title")
		this.$new_text_button = this.$table_footer.find(".new-text")

		this.$new_item_button.on("click", () => {
			this.form_wrapper.append_row({});
			window.scrollTo(0, document.body.scrollHeight);
		})

		this.$new_title_button.on("click", () => {
			let level = 1;

			const rows = this.form_wrapper.get_rows()
			const lastRow = rows.length ? rows[rows.length - 1] : null;
			if (lastRow?.row_type?.startsWith?.("title")) {
				level = parseInt(lastRow.row_type.replace("title", "")) + 1;
			}
			level = Math.min(level, 3);

			this.append_text_row_no_dialog("title" + level, __("Heading " + level));
			window.scrollTo(0, document.body.scrollHeight);
		})

		this.$new_text_button.on("click", () => {
			this.append_text_row_no_dialog("text", "");
			window.scrollTo(0, document.body.scrollHeight);
		})

		this.$delete_row_button.on("click", () => {
			const selected_rows = this.tabulator.getSelectedRows()
			selected_rows.forEach((row) => {
				const rowData = row.getData();

				if (rowData.name) {
					this.form_wrapper.remove_row(rowData.name)
				}
			});

			this.tabulator.deselectRow();
		})

		const toggle_delete_row_button = () => {
			if (this.tabulator.getSelectedRows().length) {
				this.$delete_row_button.show()
			} else {
				this.$delete_row_button.hide()
			}
		}

		this.tabulator.on("rowSelected", () => {
			toggle_delete_row_button()
		});

		this.tabulator.on("rowDeselected", () => {
			toggle_delete_row_button()
		});

		this.tabulator.on("cellEdited", (cell) => {
			this.sync_item_cell(cell)
		});

		this.tabulator.on("rowMoved", (row) => {
			const newIndex = row.getPosition() - 1; // 1-based index (0 is the header row)
			const name = row.getData().name;
			this.form_wrapper.move_rows([name], newIndex);
		});
	}

	async append_text_row_no_dialog(row_type, text = "") {
		let description = "";
		let item_name = "";
		switch (row_type) {
			case "title1":
			case "title2":
			case "title3":
				description = "";
				item_name = text;
				break;
			case "text":
				description = text;
				item_name = __("Comment");
				break;
		}
		this.form_wrapper.append_row({
			"row_type": row_type,
			"item_name": item_name,
			"qty": 1,
			"uom": await this.get_default_stock_uom() || __("Unit"),
			"rate": 0,
			"description": description,
		})
	}

	show_text_title_dialog(row_type) {
		const getTitle = (row_type) => (row_type == "text") ? __("Add Comment") : __("Add Heading");

		const dialog = new frappe.ui.Dialog({
			title: getTitle(row_type),
			primary_action_label: getTitle(row_type),
			doc: { row_type, title: "", comment: "" },
			fields: [
				{
					"label": __("Type"),
					"fieldname": "row_type",
					"fieldtype": "Select",
					"options": [
						{
							label: __("Heading 1"),
							value: "title1",
						},
						{
							label: __("Heading 2"),
							value: "title2",
						},
						{
							label: __("Heading 3"),
							value: "title3",
						},
						{
							label: __("Comment"),
							value: "text",
						},
					],
					"onchange": () => {
						const title = getTitle(dialog.get_value("row_type"));
						dialog.get_primary_btn().text(title);
						dialog.set_title(title);
					},
				},
				{
					"label": __("Title"),
					"fieldname": "title",
					"fieldtype": "Data",
					"depends_on": "eval:doc.row_type?.startsWith?.('title')",
					"mandatory_depends_on": "eval:doc.row_type?.startsWith?.('title')",
				},
				{
					"label": __("Compute Subtotal"),
					"fieldname": "with_subtotal",
					"fieldtype": "Check",
					"depends_on": "eval:doc.row_type?.startsWith?.('title')",
				},
				{
					"label": __("Comment"),
					"fieldname": "comment",
					"fieldtype": "Text Editor",
					"depends_on": "eval:doc.row_type == 'text'",
					"mandatory_depends_on": "eval:doc.row_type == 'text'",
				},
			],
			primary_action: () => {
				const values = dialog.get_values()
				const row_type = values.row_type;

				let content = "";
				let item_name = "";
				switch (row_type) {
					case "title1":
						content = `<div class="ql-editor read-mode"><h1>${values.title}</h1></div>`;
						item_name = row_type;
						break;
					case "title2":
						content = `<div class="ql-editor read-mode"><h2>${values.title}</h2></div>`;
						item_name = row_type;
						break;
					case "title3":
						content = `<div class="ql-editor read-mode"><h3>${values.title}</h3></div>`;
						item_name = row_type;
						break;
					case "text":
						content = values.comment;
						item_name = __("Comment");
						break;
				}

				this.form_wrapper.append_row({
					"row_type": row_type,
					"item_name": item_name,
					"qty": 1,
					"uom": "Unité",
					"rate": 0,
					"description": content,
				})
				dialog.hide();
			},
		});
		dialog.show();
	}

	sync_item_cell(cell) {
		const row = cell.getRow();

		const doc = row.getData();
		const fieldname = cell.getField();
		const oldValue = cell.getOldValue();
		const newValue = cell.getValue();

		// Because Tabulator did update the value directly in the row object, we need to REVERT the value first
		doc[fieldname] = oldValue;
		this.form_wrapper.update_row_value(doc, fieldname, newValue);
	}

	async get_default_stock_uom() {
		if (!this._get_default_stock_uom_memo) {
			this._get_default_stock_uom_memo = await this._get_default_stock_uom();
		}
		return this._get_default_stock_uom_memo;
	}

	async _get_default_stock_uom() {
		await frappe.model.with_doctype("Item")
		const { stock_uom } = frappe.model.get_new_doc("Item");
		if (!stock_uom) {
			const prom = new Promise((resolve, reject) => {
				const dialog = new frappe.ui.Dialog({
					title: __("Default Stock UOM"),
					fields: [
						{
							fieldtype: "Link",
							fieldname: "stock_uom",
							options: "UOM",
							label: __("Stock UOM"),
							reqd: 1,
						},
					],
					primary_action_label: __("Set"),
					primary_action: (values) => {
						resolve(values.stock_uom);
						dialog.hide();
					},
				});
				dialog.show();
			});
			return prom;
		}
		return stock_uom;
	}
}
