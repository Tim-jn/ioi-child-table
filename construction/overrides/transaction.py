from construction.construction.print import chantier_prepare_sections

def calculate_section_total(doc, method):
	sections = chantier_prepare_sections(doc)
	for item in doc.items:
		if item.name in sections[0]:
			item.section_total = sections[0][item.name]["amount"]

