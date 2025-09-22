csv = open('genelist.csv').read()
csv = csv[:-1]

csv = csv.replace('"', '')
csv = csv.split('\n')
csv = csv[1:]
print(len(csv))

genes = []
for line in csv:
    genes.append(line.split(',')[1])

print(len(genes))
print(genes, file=open('genes.txt', 'w'))