# Mise en place — Élection du délégué EFREI

Ce site est 100% statique (HTML/CSS/JS) et utilise Google Sheets +
Google Apps Script comme "base de données" pour les candidatures et les
votes. Il n'y a **rien à installer**, juste 2 choses à faire une fois :

1. Créer le Google Sheet + déployer le script.
2. Publier le site sur GitHub Pages.

**Confidentialité :** la liste des 39 électeurs (noms + e-mails) ne vit
**que** dans votre script Google Apps Script déployé (tableau `VOTERS`
dans `Code.gs`, sur votre propre compte Google) — jamais dans ce dépôt
git, qui est public. Le site demande la liste au script à chaque
vérification d'éligibilité au lieu de l'embarquer dans le code. Un
fichier `voters.json` existe dans ce dossier pour votre référence
personnelle (le format que vous m'avez donné, décodé), mais il est listé
dans `.gitignore` et ne sera jamais poussé sur GitHub — gardez-le en
local si vous voulez, ou supprimez-le, comme vous préférez.

> Pour mettre à jour la liste plus tard (nouvel étudiant, correction
> d'adresse...), modifiez uniquement le tableau `VOTERS` directement dans
> l'éditeur Apps Script (**Extensions > Apps Script** depuis le Google
> Sheet), puis créez un **nouveau déploiement** (voir la note en bas de
> l'étape 1) pour que le changement soit pris en compte.

---

## 1. Créer le Google Sheet + déployer le script

1. Allez sur [sheets.google.com](https://sheets.google.com) et créez un
   nouveau classeur, par exemple nommé **"Élection Délégué — Votes"**.
2. Dans ce classeur, allez dans **Extensions > Apps Script**.
3. Supprimez le contenu par défaut de `Code.gs` et collez-y le contenu
   du fichier [`apps-script/Code.gs`](apps-script/Code.gs) de ce projet,
   puis remplacez le tableau `VOTERS` d'exemple par la vraie liste des
   39 étudiants.
4. Cliquez sur **Déployer > Nouveau déploiement**.
   - Type : **Application Web**
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
5. Cliquez sur **Déployer**, autorisez les permissions demandées (c'est
   votre propre script, sur votre propre compte — c'est normal que
   Google demande une confirmation).
6. Copiez l'URL du type `https://script.google.com/macros/s/AKfycb.../exec`.

Le classeur Google Sheet créera automatiquement deux onglets à la
première utilisation :
- **Candidates** : `Timestamp | Email | Name`
- **Votes** : `Timestamp | VoterEmail | Candidate1 | Candidate2`

C'est dans cet onglet **Votes** que vous consultez les résultats (vous
avez choisi de garder les résultats admin-only, pas de page publique).
Pour compter les voix, vous pouvez utiliser une formule comme :

```
=COUNTIF(Votes!C2:D, "email-du-candidat@efrei.net")
```

### Mettre à jour l'URL dans le site

Ouvrez `config.js` à la racine du projet et remplacez :

```js
APPS_SCRIPT_URL: "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE",
```

par l'URL copiée à l'étape 6.

> **Si vous modifiez le script plus tard** (ex: changer la liste
> d'électeurs), vous devez créer un **nouveau déploiement** (Déployer >
> Gérer les déploiements > crayon > Nouvelle version) pour que les
> changements soient pris en compte par l'URL existante.

### Vous avez déjà déployé le script avant cette mise à jour ?

Si votre script déployé ne contient pas encore l'action `voters` (ajoutée
après votre premier déploiement), ajoutez ce bloc dans la fonction
`doGet(e)` de votre script, juste avant le `return jsonOut_({ ok: false, ... })`
final :

```js
if (action === "voters") {
  return jsonOut_({ ok: true, voters: VOTERS.map(normalize_) });
}
```

Enregistrez, puis créez un **nouveau déploiement** (Déployer > Gérer les
déploiements > crayon > Nouvelle version > Déployer) pour que l'URL
existante commence à répondre à cette action. Votre tableau `VOTERS`
existant (avec les 39 vraies adresses) n'a pas besoin de changer.

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
  une adresse e-mail de la liste peut techniquement voter/candidater à
  sa place (vous avez choisi ce compromis pour rester simple, sans
  système d'authentification). Le script empêche en revanche le **double
  vote** avec une même adresse, et rejette toute adresse absente de la
  liste `VOTERS`.
- **Pas de page de résultats publique** : consultez l'onglet "Votes" du
  Google Sheet directement.
- **Une seule élection** : ce site gère un seul groupe/classe à la fois.
  Pour plusieurs classes, dupliquez le dossier (et créez un Sheet +
  déploiement séparé par classe).
