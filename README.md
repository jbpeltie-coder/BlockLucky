# 🎟️ BlockLucky

Loterie décentralisée en smart contract Solidity, réalisée pour le Rush « BlockLucky » d'Epitech Digital (DIGI3).

La ville d'EtherBay veut organiser une loterie de fin d'année **transparente**, capable d'accueillir **10 000 participants**. Les règles sont écrites dans un smart contract public sur Ethereum : personne, pas même l'organisateur, ne peut tricher, modifier les règles ou garder la cagnotte.

Le contrat est déployé sur le **testnet Sepolia** : les ethers utilisés sont fictifs et gratuits.

| | |
|---|---|
| 🌐 **Site en ligne** | https://blocklucky-etherbay.blocklucky-web.workers.dev |
| 📜 **Contrat (Sepolia)** | [`0xAc719CD58E537Cde7c7dA732496622eE1E9B1981`](https://sepolia.etherscan.io/address/0xAc719CD58E537Cde7c7dA732496622eE1E9B1981#code) : code source vérifié sur Etherscan |

## Règles du jeu

| Paramètre | Valeur |
|---|---|
| Prix d'un ticket | 0,01 ETH |
| Tirage automatique | dès que **10 000 joueurs différents** ont acheté un ticket |
| ...ou | **10 minutes** (600 s) après le premier ticket : n'importe qui peut alors lancer le tirage |
| Limite | **2 tickets** maximum par personne et par partie |
| Gain | le gagnant reçoit **100 % de la cagnotte**, envoyée automatiquement |

Chaque ticket donne une chance : un joueur avec 2 tickets a deux fois plus de chances de gagner. Après le tirage, une nouvelle partie démarre automatiquement.

Ces paramètres sont fixés au déploiement dans `scripts/params.js`. Les démos (`npm run demo` et le mode démo du site) utilisent les mêmes règles, avec un tirage dès 5 joueurs pour aller vite.

## Conformité au cahier des charges

| Exigence du sujet | Réponse dans le projet |
|---|---|
| Smart contract de loterie, tickets payés en ethers fictifs | `contracts/BlockLucky.sol`, déployé sur Sepolia |
| Gagnant tiré au hasard après un nombre de participants **ou** une durée | Tirage automatique au 10 000e joueur, ou par n'importe qui après 10 minutes |
| **Engagement : 10 000 participants** | Contrat sans boucle ni effacement de liste : coût identique avec 5 ou 10 000 joueurs (voir « Capacité » ci-dessous). Test de charge automatisé avec 10 000 joueurs. Lecture page par page, et le site n'affiche que les 50 derniers arrivés. |
| Transparence | Code vérifié sur Etherscan, chaque achat et chaque tirage émettent un événement public, aucun privilège pour l'organisateur |
| Sécurité, fiabilité, efficacité (DSI) | Voir « Choix de sécurité » ; 17 tests automatisés |
| Facilité d'utilisation (responsable événementiel) | Écran de connexion en un clic, appli MetaMask sur téléphone (redirection puis retour), passage automatique sur Sepolia, messages d'erreur en français, mode démo sans portefeuille |
| Événement mémorable et inclusif (Maire) | Boule de loterie animée, tirage avec confettis, site adapté au mobile, animations réduites si le système le demande, navigation au clavier |
| Éducatif | Sections « Comment ça marche » et « Transparence » sur le site |
| Étapes : environnement, contrat, tests, déploiement, soutenance | Hardhat, contrat, 17 tests, déploiement Sepolia et Cloudflare, démo locale de secours |
| Outil : Remix ou Hardhat | Hardhat, pour les tests en JavaScript, les scripts de déploiement et la vérification Etherscan |
| Éthique et réglementation | Mention « 18 ans et plus » et numéro Joueurs Info Service (09 74 75 13 13) sur le site ; ethers fictifs uniquement (voir « Limites ») |

## Capacité : 10 000 participants

Chaque partie a ses propres cases de stockage, repérées par son numéro. Pour passer à la partie suivante, il suffit d'augmenter ce numéro : il n'y a **aucune liste à parcourir ni à effacer**.

La première version effaçait les listes de joueurs après chaque tirage. Avec 10 000 joueurs, ce tirage aurait dépassé la quantité maximale de calcul (gas) qu'un bloc peut contenir : le tirage aurait été impossible et la cagnotte bloquée.

Mesures du test de charge (`npm run test:scale`, 10 000 joueurs différents) :

| Opération | Gas |
|---|---|
| Achat d'un ticket (2e joueur) | 110 138 |
| Achat d'un ticket (9 999e joueur) | 110 138 : identique |
| 10 000e achat + tirage + envoi de 100 ETH au gagnant | 170 223 (limite d'un bloc : 30 000 000) |

Les fonctions de lecture `getPlayers(offset, limit)` et `getTickets(offset, limit)` renvoient au plus 500 résultats par appel (`MAX_PAGE_SIZE`).

## Structure du projet

```
contracts/BlockLucky.sol            Le smart contract de la loterie
contracts/test/RejectingPlayer.sol  Contrat utilisé uniquement par les tests
test/BlockLucky.test.js             16 tests fonctionnels
test/BlockLucky.scale.test.js       Test de charge : 10 000 joueurs
scripts/params.js                   Paramètres de la loterie (prix, joueurs, durée, limite)
scripts/deploy.js                   Déploiement sur Sepolia + mise à jour de l'adresse dans le site
scripts/verify.js                   Publication du code source sur Etherscan
scripts/demo.js                     Simulation d'une partie complète en local
web/                                Site principal : React + TanStack Start + Tailwind
web/src/lib/blocklucky/             Connexion au contrat, portefeuille, règles et mode démo (séparés du design)
deployments/                        Adresse du contrat déployé (générée par deploy.js)
.env.example                        Modèle du fichier de secrets
```

## Installation

Prérequis : [Node.js](https://nodejs.org) 18 ou plus récent, et [MetaMask](https://metamask.io) (extension ou appli mobile).

```bash
git clone https://github.com/jbpeltie-coder/BlockLucky.git
cd BlockLucky
npm install --legacy-peer-deps
npm run web:install
```

## Tests

```bash
npm test               # tous les tests du contrat (environ 30 s à cause du test de charge)
npm run test:contract  # les 16 tests fonctionnels uniquement (moins d'une seconde)
npm run test:scale     # le test de charge à 10 000 joueurs
npm --prefix web test  # les tests du site
```

Les tests couvrent : les paramètres de déploiement, le prix exact du ticket, la limite de 2 tickets, le chronomètre, le tirage automatique, le tirage manuel après le délai, la remise à zéro entre deux parties, la lecture page par page, la sécurité des paiements et la tenue à 10 000 joueurs.

## Démo locale (sans Internet ni MetaMask)

```bash
npm run demo
```

Le script lance une blockchain locale le temps de la démo, et simule deux parties :
1. 5 joueurs achètent un ticket : le contrat tire le gagnant automatiquement et lui verse la cagnotte ;
2. 2 joueurs achètent 3 tickets au total, on avance l'horloge de 10 minutes, puis un spectateur lance le tirage.

## Lancer le site en local

```bash
npm run web            # site principal sur http://localhost:5173
```

À l'arrivée, un écran de connexion propose :
- « Se connecter avec MetaMask » : l'extension sur ordinateur ; sur téléphone, l'appli MetaMask s'ouvre, puis ramène sur le site ;
- « Essayer la démo sans portefeuille » ;
- « Juste regarder la tombola ».

Le site comprend une boule de loterie animée, un tirage avec confettis, des tickets liés à leur transaction Etherscan, et un fil en direct.

## Déploiement

### Contrat sur Sepolia

1. Copie `.env.example` en `.env` et remplis-le :

| Variable | Où l'obtenir |
|---|---|
| `SEPOLIA_RPC_URL` | [Alchemy](https://dashboard.alchemy.com) ou [Infura](https://app.infura.io) : une app sur Ethereum Sepolia, URL HTTPS |
| `PRIVATE_KEY` | MetaMask, sur un compte **dédié aux tests** : ⋮ → Détails du compte → Afficher la clé privée |
| `ETHERSCAN_API_KEY` | [etherscan.io/myapikey](https://etherscan.io/myapikey) (compte gratuit) |

2. Lance les deux commandes :

```bash
npm run deploy:sepolia   # déploie, puis écrit l'adresse dans le site et dans deployments/sepolia.json
npm run verify:sepolia   # publie le code source sur Etherscan
```

Le compte doit avoir quelques SepoliaETH, par exemple via le [faucet Google Cloud](https://cloud.google.com/application/web3/faucet/ethereum/sepolia).

> ⚠️ Le fichier `.env` est ignoré par git. Ne le partage jamais, et n'utilise jamais la clé privée d'un compte qui contient de vrais fonds.

### Site sur Cloudflare Workers

```bash
npm run web:deploy
```

Cette commande compile le site pour Cloudflare Workers et met la nouvelle version en ligne sur https://blocklucky-etherbay.blocklucky-web.workers.dev. Il faut être connecté à Cloudflare (`npx wrangler login`) avec un compte qui a accès au site.

## Tester avec plusieurs joueurs

1. Dans MetaMask, crée 2 ou 3 comptes et envoie-leur environ 0,02 SepoliaETH chacun.
2. Pour chaque compte : connecte-le au site (bouton portefeuille « Changer de compte » en haut à droite), puis achète 1 ou 2 tickets.
3. Attends la fin des 10 minutes et clique sur « Lancer le tirage ».
4. Le gagnant s'affiche, et son solde augmente de la cagnotte dans MetaMask.

## Choix de sécurité

- **Paramètres immuables** : le prix, le nombre de joueurs, la durée et la limite sont fixés au déploiement (`immutable`). Personne ne peut les modifier ensuite.
- **Aucun privilège pour l'organisateur** : il ne peut ni retirer la cagnotte ni choisir le gagnant. Le tirage après délai peut être lancé par n'importe qui.
- **Prix exact obligatoire** : le contrat refuse tout montant différent du prix du ticket, ainsi que les envois d'ETH directs.
- **Checks-Effects-Interactions et anti-réentrance** : l'état passe à la partie suivante *avant* l'envoi de la cagnotte, et les fonctions sensibles sont verrouillées (`nonReentrant`).
- **Pas de blocage possible** : si le gagnant ne peut pas recevoir d'ETH, son gain est mis de côté et récupérable avec `withdraw()`.
- **Coût constant** : aucune opération ne dépend du nombre de joueurs, donc aucun tirage ne peut devenir trop coûteux pour un bloc.
- **Erreurs personnalisées** : les messages d'erreur sont clairs et moins chers en gas.

## Limites et pistes pour une version réelle

- **Le hasard** : le tirage utilise `block.prevrandao` et des données du bloc. C'est suffisant pour un testnet et une démonstration, mais pas pour de vrais enjeux : un validateur pourrait en théorie influencer le résultat. En production, il faudrait un oracle de hasard vérifiable comme **Chainlink VRF**.
- **Les frais pour 10 000 joueurs** : chaque joueur paie environ 110 000 gas par ticket. Sur Ethereum (réseau principal), ces frais peuvent peser sur un public large. Un réseau de « couche 2 » (Base, Arbitrum, Optimism…) les rendrait bien plus bas, avec le même contrat.
- **Le cadre légal** : en France, les loteries d'argent sont très encadrées (Autorité nationale des jeux). Une version avec de vrais fonds demanderait une validation juridique, une vérification de l'âge et de l'identité des joueurs, et des mesures de jeu responsable. Le projet reste volontairement sur un réseau de test, avec des ethers sans valeur.

## Technologies

Solidity 0.8.24 · Hardhat · ethers.js v6 · React · TanStack Start · Tailwind CSS · MetaMask (extension et SDK mobile) · Etherscan · Cloudflare Workers · testnet Sepolia
