# ORIGIN/RP_ID must equal the public hostname or passkey login breaks; the hostname is only
# known after the Web App exists, so it can't be set as a plain bicep app-setting literal.
$ErrorActionPreference = "Stop"

az webapp config appsettings set `
    --resource-group $env:AZURE_RESOURCE_GROUP `
    --name $env:WEB_APP_NAME `
    --settings "ORIGIN=https://$env:WEB_APP_DEFAULT_HOSTNAME" "RP_ID=$env:WEB_APP_DEFAULT_HOSTNAME" `
    --output none
