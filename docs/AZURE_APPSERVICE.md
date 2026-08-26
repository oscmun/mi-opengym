# Deploying to Azure App Service

An alternative to `docker compose up` for people who want openGym running on Azure instead of
their own hardware. This provisions one Linux App Service running a single container (nginx +
the API together — see why below), backed by Azure Files for persistent data.

## Prerequisites

- An Azure subscription
- [Azure Developer CLI (`azd`)](https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd)
- Docker, to let `azd` build the image locally before pushing it

## 1. Provision and deploy

```bash
azd auth login
azd up
```

`azd up` will:

1. Ask for an environment name, subscription and region.
2. Create a resource group containing:
   - An Azure Container Registry
   - A Linux App Service Plan (`B1` by default) and Web App (single container)
   - A Storage Account with an Azure Files share, mounted into the container at `/data`
3. Build [`deploy/azure/Dockerfile`](../deploy/azure/Dockerfile) and push it to the registry
4. Deploy it to the Web App
5. Run a post-provision hook that sets `ORIGIN`/`RP_ID` to the app's `*.azurewebsites.net`
   hostname (see [Custom domains](#3-custom-domains) — this must be redone if you add one)

When it finishes, open the printed URL and create a profile with a passkey, same as self-hosting
with Docker.

## 2. Why one container instead of two

Locally, openGym runs as two containers (`web` for nginx, `api` for the Node backend) so nginx
can serve the frontend and reverse-proxy `/api/` to the API on one origin — required because
WebAuthn/passkeys bind to a single hostname (`ORIGIN`/`RP_ID`). A single Azure App Service Linux
Web App only runs one container per app, so [`deploy/azure/Dockerfile`](../deploy/azure/Dockerfile)
combines both processes into one image (started by
[`deploy/azure/start.sh`](../deploy/azure/start.sh)), preserving the same single-origin setup.

## 3. Custom domains

If you bind a custom domain to the Web App, update `ORIGIN`/`RP_ID` to match it and restart —
otherwise passkey login breaks, since it's bound to whichever hostname was set at registration
time:

```bash
az webapp config appsettings set \
  --resource-group <your-resource-group> \
  --name <your-web-app-name> \
  --settings ORIGIN=https://gym.example.com RP_ID=gym.example.com
az webapp restart --resource-group <your-resource-group> --name <your-web-app-name>
```

> Changing `RP_ID` invalidates existing passkeys — pick your domain before people register.

## 4. Exercise media

Unlike the Docker Compose setup, there's no `media` volume to populate on Azure. The image build
instead points the frontend at the same jsdelivr CDN mirror of the exercises dataset already used
for mobile builds (`VITE_IMG_BASE`/`VITE_GIF_BASE`), so no extra storage or download step is
needed. Override these build args in `deploy/azure/Dockerfile` if you'd rather serve your own copy
of the media from somewhere else.

## 5. Data persistence

`db.json`, `secret`, `vapid.json` and each user's `state-<uid>.json` live under `/data`, which is
mounted from an Azure Files share — so they survive restarts and redeploys. Back it up like any
Azure Files share (e.g. `az storage file download` per file, or an AzCopy sync).

## 6. Scaling — do not scale out

openGym's data store is a set of JSON files with no cross-instance write coordination. Scaling
the App Service Plan to more than **one instance** will corrupt data (concurrent writers racing
on the same files). Scale **up** (a bigger SKU) if you need more capacity, never **out**.

## 7. Logs and redeploys

```bash
az webapp log tail --resource-group <your-resource-group> --name <your-web-app-name>
azd deploy   # rebuild and redeploy after code changes
```
