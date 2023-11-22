frappe.provide("construction")

construction.document_grid = class DocumentGrid {
	constructor(opts) {
		Object.assign(this, opts)
		this.prepare_wrapper()
		this.make_grid()
	}

	prepare_wrapper() {
		this.wrapper.html("")
		this.file_view = $(`<div class="file-view"></div>`).appendTo(this.wrapper)
		this.wrapper.addClass("file-grid-view")

		if (!Object.keys(this.data).length) {
			$(`<div class="msg-box no-border">
				<div>
					<img src="/assets/frappe/images/ui-states/list-empty-state.svg" alt="Generic Empty State" class="null-state">
					<p>${__("No documents to show")}</p>
				</div>
			</div>`).appendTo(this.file_view)
		}
	}

	make_grid() {
		Object.keys(this.data).map(dt => {
			Object.keys(this.data[dt]).map(dn => {
				const ref_wrapper = this.add_ref_to_grid(dt, dn)
				this.add_files_to_grid(this.data[dt][dn], ref_wrapper)
			})
		})
	}

	add_ref_to_grid(dt, dn) {
		const title = `${__(dt)}: ${dn}`
		return $(`<div class="file-grid-view mb-5">
			${frappe.utils.get_form_link(
				dt,
				dn,
				true,
				title
			)}
			<div class="file-grid">
			</div>
		</div>`).appendTo(this.file_view)
	}

	add_files_to_grid(data, wrapper) {
		const html = data.map(d => {
			d = this.prepare_datum(d)

			const icon_class = d.icon_class + "-large";
			let file_body_html =
				d._type == "image"
					? `<div class="file-image"><img src="${d.file_url}" alt="${d.file_name}"></div>`
					: frappe.utils.icon(icon_class, {
							width: "40px",
							height: "45px",
						});
			const name = escape(d.name);
			return `<a href="${d.file_url}" class="file-wrapper ellipsis" data-name="${name}" target="_blank">
					<div class="file-body">
						${file_body_html}
					</div>
					<div class="file-footer">
						<div class="file-title ellipsis">${d._title}</div>
						<div class="file-creation">${this.get_creation_date(d)}</div>
					</div>
				</a>`
		}).join("")


		wrapper.find(".file-grid").append($(html))
	}

	prepare_datum(d) {
		let icon_class = "";
		let type = "";
		if (d.is_folder) {
			icon_class = "folder-normal";
			type = "folder";
		} else if (frappe.utils.is_image_file(d.file_name)) {
			icon_class = "image";
			type = "image";
		} else {
			icon_class = "file";
			type = "file";
		}

		let title = d.file_name || d.file_url;
		title = title.slice(0, 60);
		d._title = title;
		d.icon_class = icon_class;
		d._type = type;

		d.subject_html = `
			${frappe.utils.icon(icon_class)}
			<span>${title}</span>
			${d.is_private ? '<i class="fa fa-lock fa-fw text-warning"></i>' : ""}
		`;
		return d;
	}

	get_creation_date(file) {
		const [date] = file.creation.split(" ");
		let created_on;
		if (date === frappe.datetime.now_date()) {
			created_on = comment_when(file.creation);
		} else {
			created_on = frappe.datetime.str_to_user(date);
		}
		return created_on;
	}
}