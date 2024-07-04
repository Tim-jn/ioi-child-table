from collections import defaultdict

item_sum_keys = ["amount"]


def chantier_prepare_sections(doc):
	last_counter = (0, 0, 0, 0)

	def counters(cnt: tuple[int], sep="."):
		cnt = list(cnt)
		while cnt and cnt[-1] == 0:
			cnt.pop()
		if not cnt:
			return ""
		return sep.join(map(str, cnt)) + sep

	def counter_incr(cnt: tuple[int], level: int):
		return cnt[:level] + (cnt[level] + 1,) + (0,) * (len(cnt) - level - 1)

	def make_section(row):
		level = int(item.row_type[5:])
		section = {key: [] for key in item_sum_keys}
		section["row"] = row
		section["title"] = row.item_name
		section["level"] = level
		section["name"] = row.name
		section["last_item_row"] = row.name

		nonlocal last_counter
		last_counter = counter_incr(last_counter, level - 1)
		section["counter"] = counters(last_counter)
		return section

	section_list = []  # list of sections in order
	section_map = {}  # map of row name to section for quick lookup
	active_sections = {}
	for item in doc.items:
		if isinstance(item.row_type, str) and item.row_type.startswith("title"):
			section = make_section(item)

			section_map[section["name"]] = section
			active_sections[section["level"]] = None

			if item.with_subtotal:
				section_list.append(section)
				active_sections[section["level"]] = section

		for section in active_sections.values():
			if not section:
				continue
			for key in item_sum_keys:
				section[key].append(getattr(item, key, 0))
			section["last_item_row"] = item.name

	for section in section_list:
		for key in item_sum_keys:
			section[key] = sum(section[key])

	section_ends = defaultdict(lambda: [])  # map of row name to list of section names
	for section in reversed(section_list):
		section_ends[section["last_item_row"]].append(section["name"])
	# when there are multiple sections ending at the same row, they are in reverse order

	return section_map, section_ends


def before_print(doc, method, settings, *args, **kwargs):
	if doc.doctype not in ("Quotation", "Sales Order", "Sales Invoice"):
		return

	doc.print_templates["items"] = "construction/print/items.html"
	doc.print_templates["progress_invoicing_summary"] = "construction/print/progress_invoicing_summary.html"

	doc.flags.compact_progress_item_fields = ["posting_date", "sales_invoice"]
	doc.child_print_templates = {
		"progress_invoicing_summary": {
			"label": "construction/print/progress_invoicing_summary_description.html"
		}
	}

	# Compute subtotals for each section
	doc.print_chantier_sections, doc.print_chantier_section_ends = chantier_prepare_sections(doc)
	doc.print_chantier_section_columns = item_sum_keys
