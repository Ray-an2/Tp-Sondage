# TP 6 - Deploiement (Client + Server + Nginx)

## Prerequis
- Avoir fait les 5 TP précèdents 
- `deno` installé
- `mkcert` installé
- `nginx` en local dans `~/.local/bin/nginx`
- entree hosts:
  - `app.sor.localhost`

## Certificats TLS

Depuis la racine du projet (`~/tp_sor`):

```bash
mkcert sor.localhost "*.sor.localhost"
```

Cela génère des fichiers `.pem` a utiliser dans `nginx.conf`.

## Lancement

Ouvrir 3 terminaux.

### 1) Server (Deno/Oak)

```bash
cd ~/tp_sor/server
deno run dev
```

### 2) Client (Vite)

```bash
cd /home/rayan/tp_sor/client
deno run dev
```

### 3) Nginx (reverse proxy HTTPS)

```bash
cd /home/rayan/tp_sor
~/.local/bin/nginx -p "$PWD" -c nginx.conf
```

## URL d'acces

- Application: `https://app.sor.localhost:4443`

## Arreter Nginx

Depuis la racine du projet:

```bash
kill "$(cat nginx.pid)"
```

## Notes

- Le proxy route:
  - `/` vers Vite (`127.0.0.1:3000`)
  - `/api/` vers le backend (`127.0.0.1:8000`)
  - `/ws/` vers les WebSockets backend (`127.0.0.1:8000/votes/`)
- Si `nginx.conf` est modifié, le redémarrer avec la commande ci-dessous.
```bash
~/.local/bin/nginx -p "$PWD" -c nginx.conf
```
- Si vous n'arriver pas à lancer nginx, vous pouvez comme même lancer le client-server et sur la barre de recherche, taper :`http://127.0.0.1:3000`