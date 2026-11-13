# BlockLucky — site web

Interface de la Grande Tombola d'EtherBay : React, TanStack Start (rendu serveur), Tailwind CSS, framer-motion et ethers.js v6.

## Commandes

```bash
npm install     # installation (le fichier .npmrc active legacy-peer-deps)
npm run dev     # site en local sur http://localhost:5173
npm test        # tests (règles de la loterie, routage)
npm run build   # version hébergée (Cloudflare Workers, voir wrangler.jsonc)
```

## Organisation

- `src/lib/blocklucky/` : connexion au contrat Sepolia, choix du portefeuille (extension ou appli MetaMask), règles et mode démo. Cette partie est indépendante du design.
- `src/components/blocklucky/` : écran de connexion, boule de loterie, tickets, animation du tirage.
- `src/routes/index.tsx` : la page principale.

L'adresse du contrat (`src/lib/blocklucky/config.ts`) est mise à jour automatiquement par `npm run deploy:sepolia` à la racine du projet.
