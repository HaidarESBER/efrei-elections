# Mise en place — Élection du délégué EFREI

Ce site est 100% statique (HTML/CSS/JS) et utilise Google Sheets +
Google Apps Script comme "base de données" pour les candidatures et les
votes. Il n'y a **rien à installer**, juste 2 choses à faire une fois :

1. Créer le Google Sheet + déployer le script.
2. Publier le site sur GitHub Pages.

**Ce site gère plusieurs classes en même temps** (ex: M1 DEV1, MDT TD1,
MDT TD2...). Une seule page d'accueil sert tout le monde : la personne
tape son e-mail, le script détermine automatiquement à quelle classe
elle appartient, et lui montre le bon bulletin.

### Comment ça marche — les onglets "Voters - ..."

Dans votre Google Sheet, chaque classe a son propre onglet nommé
**`Voters - <Nom de la classe>`**, contenant juste une colonne
d'e-mails (un par ligne), par exemple :

- `Voters - M1 DEV1`
- `Voters - MDT TD1`
- `Voters - MDT TD2`

Le script scanne tous les onglets qui commencent par `Voters - ` pour
savoir dans quelle classe se trouve un e-mail. **Pour ajouter une
nouvelle classe plus tard, dupliquez un onglet existant, renommez-le,
collez les e-mails — c'est tout.** Aucun code à modifier, aucun
redéploiement nécessaire : le script lit la liste en direct à chaque
requête.

**Confidentialité :** ces listes ne vivent **que** dans votre Google
Sheet, sur votre propre compte Google — jamais dans ce dépôt git, qui
est public. Le site demande au script "à qui appartient cet e-mail ?"
au lieu d'embarquer une liste dans le code ou de la télécharger dans le
navigateur.

Un fichier `apps-script/Voters-M1DEV1.snippet.txt` a été généré dans ce
dossier avec les 39 e-mails de la classe M1 DEV1 déjà prêts à coller
(un par ligne). Il est listé dans `.gitignore` et ne sera jamais poussé
sur GitHub.

---

## 1. Créer le Google Sheet + déployer le script

1. Allez sur [sheets.google.com](https://sheets.google.com) et créez un
   nouveau classeur, par exemple nommé **"Élections Délégués — Votes"**.
2. Créez un onglet par classe, nommé exactement `Voters - <Classe>` :
   - `Voters - M1 DEV1` → collez le contenu de
     `apps-script/Voters-M1DEV1.snippet.txt` dans la colonne A (une
     adresse par ligne).
   - `Voters - MDT TD1` → collez la liste des e-mails de cette classe.
   - `Voters - MDT TD2` → collez la liste des e-mails de cette classe.
3. Dans ce classeur, allez dans **Extensions > Apps Script**.
4. Supprimez le contenu par défaut de `Code.gs` et collez-y le contenu
   du fichier [`apps-script/Code.gs`](apps-script/Code.gs) de ce projet
   tel quel — il n'y a rien à modifier dans le code, les classes viennent
   des onglets `Voters - ...`.
5. Cliquez sur **Déployer > Nouveau déploiement**.
   - Type : **Application Web**
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
6. Cliquez sur **Déployer**, autorisez les permissions demandées (c'est
   votre propre script, sur votre propre compte — c'est normal que
   Google demande une confirmation).
7. Copiez l'URL du type `https://script.google.com/macros/s/AKfycb.../exec`.

Le classeur créera automatiquement deux onglets partagés entre toutes
les classes, à la première utilisation :
- **Candidates** : `Timestamp | Email | Name | Class`
- **Votes** : `Timestamp | VoterEmail | Candidate1 | Candidate2 | Class`

La colonne **Class** vous permet de filtrer/trier pour ne voir que les
résultats d'une classe (vous avez choisi de garder les résultats
admin-only, pas de page publique). Pour compter les voix d'une classe
précise, filtrez d'abord la colonne Class, puis :

```
=COUNTIF(Votes!C2:D, "email-du-candidat@efrei.net")
```

### Mettre à jour l'URL dans le site

Ouvrez `config.js` à la racine du projet et remplacez :

```js
APPS_SCRIPT_URL: "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE",
```

par l'URL copiée à l'étape 7.

> **Si vous modifiez le script plus tard** (ex: changer la liste
> d'électeurs), vous devez créer un **nouveau déploiement** (Déployer >
> Gérer les déploiements > crayon > Nouvelle version) pour que les
> changements soient pris en compte par l'URL existante.

### Vous avez déjà une élection M1 DEV1 en cours ?

(script déployé avant cette mise à jour multi-classes)

Ce site gérait au départ une seule classe, avec un tableau `VOTERS`
codé en dur dans le script. La nouvelle version passe par les onglets
`Voters - <Classe>` à la place. Migration à faire une fois :

1. Créez l'onglet **`Voters - M1 DEV1`** dans votre Google Sheet, et
   collez-y le contenu de `apps-script/Voters-M1DEV1.snippet.txt`
   (colonne A, un e-mail par ligne).
2. Remplacez **tout le contenu** de `Code.gs` (dans l'éditeur Apps
   Script) par le nouveau fichier
   [`apps-script/Code.gs`](apps-script/Code.gs) — l'ancien tableau
   `VOTERS` n'est plus utilisé et peut disparaître.
3. Vos candidatures et votes déjà enregistrés (colonnes `Candidates` et
   `Votes`) continuent de fonctionner sans rien changer : le script
   traite toute ligne sans valeur dans la colonne `Class` comme
   appartenant à `M1 DEV1`.
4. Créez un **nouveau déploiement** (Déployer > Gérer les déploiements
   > crayon > Nouvelle version > Déployer) pour que l'URL existante
   utilise le nouveau code.
5. Créez les onglets `Voters - MDT TD1` et `Voters - MDT TD2` avec
   leurs listes d'e-mails respectives dès que vous les avez.

---

## 2. Publier le site sur GitHub Pages

1. Créez un dépôt GitHub (public), par exemple `efrei-elections`.
2. Depuis ce dossier (`C:\Users\hes\efreielections`), initialisez git et
   poussez le code :

   ```
   git init
   git add .
   git commit -m "Site élection délégué EFREI"
   git branch -M main
   git remote add origin https://github.com/<votre-compte>/efrei-elections.git
   git push -u origin main
   ```

3. Sur GitHub, allez dans **Settings > Pages**.
4. Sous "Build and deployment", choisissez **Deploy from a branch**,
   branche `main`, dossier `/ (root)`.
5. Après quelques minutes, votre site sera disponible à une adresse du
   type `https://<votre-compte>.github.io/efrei-elections/`.

Partagez ce lien avec votre classe : `index.html` (page d'accueil) sera
servi automatiquement.

---

## Tester en local avant de publier

Ouvrir directement les fichiers `.html` avec `file://` ne fonctionnera
pas dans certains navigateurs. Lancez un petit serveur local depuis ce
dossier :

```
# Python (déjà installé sur la plupart des machines)
python -m http.server 8000
```

puis ouvrez `http://localhost:8000` dans votre navigateur.

---

## Limites à connaître

- **Pas de vérification d'identité forte** : n'importe qui connaissant
  une adresse e-mail d'une liste peut techniquement voter/candidater à
  sa place (vous avez choisi ce compromis pour rester simple, sans
  système d'authentification). Le script empêche en revanche le **double
  vote** avec une même adresse, et rejette toute adresse absente de
  **toutes** les listes `Voters - ...`.
- **Pas de page de résultats publique** : consultez l'onglet "Votes" du
  Google Sheet directement (filtrez par la colonne `Class` pour une
  classe précise).
- **Un e-mail = une seule classe** : si la même adresse apparaît dans
  deux onglets `Voters - ...` différents, le script retient la première
  qu'il trouve en parcourant les onglets — évitez les doublons entre
  classes.
