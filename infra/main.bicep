// azd entry point: creates the resource group, then hands off to resources.bicep.
targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the azd environment; used to derive resource names')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

@description('App Service Plan SKU (Linux)')
param appServicePlanSku string = 'B1'

@description('Azure Files share quota, in GiB')
param fileShareQuotaGiB int = 5

var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
var tags = {
  'azd-env-name': environmentName
}

resource rg 'Microsoft.Resources/resourceGroups@2024-11-01' = {
  name: 'rg-${environmentName}'
  location: location
  tags: tags
}

module resources 'resources.bicep' = {
  name: 'opengym-resources'
  scope: rg
  params: {
    location: location
    resourceToken: resourceToken
    tags: tags
    appServicePlanSku: appServicePlanSku
    fileShareQuotaGiB: fileShareQuotaGiB
  }
}

output AZURE_CONTAINER_REGISTRY_ENDPOINT string = resources.outputs.AZURE_CONTAINER_REGISTRY_ENDPOINT
output AZURE_RESOURCE_GROUP string = rg.name
output WEB_APP_NAME string = resources.outputs.WEB_APP_NAME
output WEB_APP_DEFAULT_HOSTNAME string = resources.outputs.WEB_APP_DEFAULT_HOSTNAME
