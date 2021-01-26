import json

def translate_street_type(raw_type):
	csv_infile = open('translation_guide.csv', 'r')
	for line in csv_infile.readlines():
		tokens = line.split(',')
		#print('Comparing ' + raw_type.replace('\n', '').lower() + ' and ' + tokens[0].lower())
		if raw_type.replace('\n', '').lower() == tokens[0].lower():
			return tokens[1].replace('\n', '')
	return ''


def encode_raw_file(fname):
	f = open(fname, 'r')
	total_list = []
	for line in f.readlines():
		street_dict = {}
		tokens = line.split(' ')
		street_type = translate_street_type(tokens[-1])
		street_name = ''
		for token in tokens[:-1]:
			street_name += token
			if(token != tokens[-2]):
				street_name += ' '
		street_dict['streetName'] = street_name
		street_dict['streetType'] = street_type
		total_list += [street_dict]
	total_dict = {}
	total_dict['Newport News'] = total_list

	json_string = json.dumps(total_dict, sort_keys=True, indent=4)
	outfile_name = fname.split('.')[0].replace('_raw', '')
	outfile = open(outfile_name + '.json', 'w+')
	outfile.write(json_string)
	outfile.close()
	f.close()



fname = 'newport_news_streets_raw.txt'
encode_raw_file(fname)