#!/bin/sh
# ORIGIN/RP_ID must equal the public hostname or passkey login breaks; the hostname is only
# known after the Web App exists, so it can't be set as a plain bicep app-setting literal.
set -e

az webapp config appsettings set \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --name "$WEB_APP_NAME" \
    --settings ORIGIN="https://$WEB_APP_DEFAULT_HOSTNAME" RP_ID="$WEB_APP_DEFAULT_HOSTNAME" \
    --output none
