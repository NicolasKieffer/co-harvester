# co-harvester

Harverster compatible avec de multiple API. Il peut faire une simple requête ou effectuer un scroll (récupération d'une succession de requêtes)

## Installation ##

```bash
npm install
```

_**Note : need at least Node v10.x.x**_

Si vous avez ce genre d'erreur, cela peut venir de la version de node qui n'est pas assez récente.

```js
ReferenceError: URL is not defined
    at Hal.requestByQuery (/xxx/co-harvester/lib/hal.js:28:18)
    at Object.<anonymous> (/xxx/co-harvester/index.js:125:18)
    at Module._compile (module.js:635:30)
    at Object.Module._extensions..js (module.js:646:10)
    at Module.load (module.js:554:32)
    at tryModuleLoad (module.js:497:12)
    at Function.Module._load (module.js:489:3)
    at Function.Module.runMain (module.js:676:10)
    at startup (bootstrap_node.js:187:16)
    at bootstrap_node.js:608:3
```

Pour *réparer* ce bug, il faut passer à une version de nodejs supérieur ou égale à 10 :

```bash
node --version # should print at least v10.x

# install via nodejs : https://nodejs.org/dist/latest-v10.x/ 

# install via nvm
nvm install 10
nvm use 10
nvm alias default 10 # mettre la version 10 de node par défaut
```

## Prérequis ##

Un fichier de configuration pour la source à moissonner (exemples dans conf/*.json) **lorsqu'un fichier d'id(s) est utilisé**. Sinon, ce sont les paramètres passés en ligne de commande qui seront utilisés.

## Help ##

```bash
node index.js --help

Usage: index [options]

Options:
  --source <source>  required  targetted source (hal|conditor|crossref|pubmed)
  --query <query>    required   API query
  --ids <ids>        optionnal  path of file containing ids (one id by line)
  --conf <conf>      optionnal  conf path
  --limit <limit>    optionnal  number of file(s) downloaded simultaneously
  --quiet            optionnal  quiet mode
  -h, --help         output usage information

Usages exemples: https://github.com/conditor-project/co-harvester

More infos about [CONDITOR API] here: https://github.com/conditor-project/api/blob/master/doc/records.md
More infos about [CROSSREF API] here: https://github.com/CrossRef/rest-api-doc
More infos about [HAL API] here: http://api.archives-ouvertes.fr/docs
More infos about [PUBMED API] here: https://www.ncbi.nlm.nih.gov/books/NBK25501/

```

## Exemples ##

**Note : Pour les moissonnages via liste d'ids, c'est le fichier de configuration qui est utilisé (et non plus les paramètres passer en ligne de commande)**

**Dans ce cas : pour préciser l'output, ~~--output~~ -> --conf=conf.json (propriété output du fichier)**

### Conditor ###

```bash
# query sur localhost (= un fichier .json)
node index.js --query="http://localhost:63332/v1/records?q=%22doi:*%22&page_size=1000&includes=doi&scroll=1m" --source=conditor
# query sur un serveur distant (= un fichier .json)
node index.js --query="https://api.conditor.fr/v1/records?q=%22doi:*%22&page_size=1000&includes=doi&scroll=1m" --source=conditor
# liste d'ids sur un serveur distant (= un fichier .gz avec un fichier par id)
node index.js --ids=ids/conditor.txt --conf=conf/conditor.json --source=conditor
# Traiter un fichier .json pour en extraire un corpus de document
node tools/extractFiles.js --input="out/conditor.json" --output="out/conditor.gz" --data="teiBlob" --id="idConditor" --ext=".tei"
```

### Crossref ###

```bash
# liste d'ids sur un serveur distant (= un fichier .gz avec un fichier par id)
node index.js --ids=ids/crossref/doi_wos_2014.txt --conf=conf/crossref.json --source=crossref
```

### Pubmed ###

```bash
# query sur localhost (= un fichier .gz avec un fichier par document)
node index.js --query="http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=2017[DP] AND FRANCE[Affiliation]&usehistory=y&retmode=json&retmax=1000" --source=pubmed
```

**NOTE : Pour la source Pubmed, une query renverra un corpus de document XML**

### Hal ###

```bash
# query sur un serveur distant (= un fichier .json)
node index.js --query="https://api.archives-ouvertes.fr/search/?wt=json&q=structCountry_s:(fr OR gf OR gp OR mq OR re OR yt OR bl OR mf OR pf OR pm OR wf OR nc)&fq=producedDateY_i:2014&fl=docid,halId_s,label_xml&sort=docid+desc&rows=1000&cursorMark=*" --source=hal
# query sur un serveur distant (= un fichier .json)
node index.js --query="http://api.archives-ouvertes.fr/ref/structure?fq=country_s:fr&fl=*&q=*&rows=1000&sort=docid asc&cursorMark=*" --source=hal
# Traiter un fichier .json pour en extraire un corpus de document
node tools/extractFiles.js --input="out/hal.json" --output="out/hal.gz" --data="label_xml" --id="docid" --ext=".xml"
```
