# co-harvester

Harverster compatible avec l'API Conditor. Il peut faire une simple requête ou effectuer un scroll (récupération de corpus)

## Installation ##

```bash
npm install
```

## Prérequis ##

Le token d'authentification est nécessaire pour pouvoir accèder à l'API Conditor.

```bash
# export variable
export CONDITOR_TOKEN="myToken";
# pass variable to process node
env CONDITOR_TOKEN="myToken" node index.js
node index.js --token="myToken"
# set token into conditor query url
node index.js  --query="http://api.conditor.fr/v1/records?q=%22*%22&access_token=myToken"
```

## Help ##

```bash
node index.js --help
```

### Liste des paramètres disponibles pour l'API conditor ###


```bash
--query="a valid conditor query url"
```

Consultez [la documentation de l'API](https://github.com/conditor-project/api) pour plus d'informations.

### Liste des autres paramètres du harvester ###

```bash
--output --criteria --format
```

Le paramètre `output` permet de définir le chemin du fichier de sortie. Par défaut : `"./output.txt"`

```bash
--output="myPath" # Chemin du fichier de sortie.
```

Il est possible de formater les données en utilisant : `--format` et `--criteria`.
Par défaut, le résultat brut de l'API est renvoyé par le harvester.

Le paramètre `criteria` doit obligatoirement être [une des valeurs suivantes](https://github.com/conditor-project/api/blob/master/doc/recordFields.md)

```bash
--criteria="doi" # Critère utilisé pour regrouper les 'hits' entre eux (ex: doi, issue, halId, etc).
```

Le paramètre `format` permet de modifier la structure du résultat d'un scroll.

```bash
--format="object" # Résultat sous la forme d'objet (regroupé par 'criteria' de même valeur)
--format="array" # Résultat sous la forme d'un tableau (regroupé par 'criteria' de même valeur)
--format="list" # Résultat sous la forme d'une liste (dédoublonnée) de toutes les valeurs de 'criteria' (ex : liste des doi)
```

## Exemples ##

Récupérer tous les documents ayant un doi (scroll) :

```bash
# localhost
node index.js --query="http://localhost:63332/v1/records?q=%22doi:*%22&page_size=1000&includes=doi&scroll=1m" --scroll
# serveur distant
node index.js --query="https://api.conditor.fr/v1/records?q=%22doi:*%22&page_size=1000&includes=doi&scroll=1m" --token="myToken" --scroll
```

Récupérer la liste des doi (scroll) :

```bash
node index.js --query="http://localhost:63332/v1/records?q=%22doi:*%22&page_size=1000&includes=doi&scroll=1m" --format="list" --criteria="doi"
```

Récupérer le nombre de documents ayant un doi ([aggrégations](https://github.com/conditor-project/api/blob/master/doc/aggregations.md)) :

```bash
node index.js --query="http://localhost:63332/v1/records?q=%22doi:*%22&aggs=cardinality:doi.normalized&page_size=0"
```

## Script ##

### scrollToCSV.js ###

Construire un fichier CSV à partir du résultat d'un scroll (JSON renvoyé par l'API)

```bash
node scripts/scrollToCSV.js --input scroll.out --fields "sourceUid,idConditor,duplicates.source,duplicates.idConditor,nearDuplicates.source,nearDuplicates.idConditor,nearDuplicatesDetectedBySimilarity.source,nearDuplicatesDetectedBySimilarity.idConditor,idChain" > scroll.csv
```
