@description('Primary location for all resources')
param location string

@description('Short unique token used to derive resource names')
param resourceToken string

param tags object

@description('App Service Plan SKU (Linux)')
param appServicePlanSku string

@description('Azure Files share quota, in GiB')
param fileShareQuotaGiB int

var acrName = 'acr${resourceToken}'
var planName = 'plan-opengym-${resourceToken}'
var webAppName = 'app-opengym-${resourceToken}'
var storageAccountName = take('stopengym${resourceToken}', 24)
var fileShareName = 'opengym-data'

resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  #disable-next-line BCP334 // uniqueString() always returns 13 chars, so acrName is always well within bounds
  name: acrName
  location: location
  tags: tags
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
  }
}

resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  tags: tags
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
  }
}

resource fileService 'Microsoft.Storage/storageAccounts/fileServices@2023-01-01' = {
  parent: storage
  name: 'default'
}

resource fileShare 'Microsoft.Storage/storageAccounts/fileServices/shares@2023-01-01' = {
  parent: fileService
  name: fileShareName
  properties: {
    shareQuota: fileShareQuotaGiB
  }
}

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  tags: tags
  sku: {
    name: appServicePlanSku
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

// Bootstrap image only — `azd deploy` builds deploy/azure/Dockerfile, pushes it to acr,
// and repoints this app to the real image.
resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: webAppName
  location: location
  tags: union(tags, { 'azd-service-name': 'web' })
  kind: 'app,linux,container'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOCKER|mcr.microsoft.com/appsvc/staticsite:latest'
      alwaysOn: true
      acrUseManagedIdentityCreds: true
      appSettings: [
        { name: 'DATA_DIR', value: '/data' }
        { name: 'PORT', value: '3000' }
        { name: 'RP_NAME', value: 'openGym' }
        { name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE', value: 'false' }
        { name: 'WEBSITES_PORT', value: '80' }
      ]
      azureStorageAccounts: {
        data: {
          type: 'AzureFiles'
          accountName: storage.name
          shareName: fileShareName
          mountPath: '/data'
          accessKey: storage.listKeys().keys[0].value
        }
      }
    }
  }
}

var acrPullRoleId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  '7f951dda-4ed3-4680-a7ca-43fe172d538d'
)

resource acrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acr.id, webApp.id, acrPullRoleId)
  scope: acr
  properties: {
    principalId: webApp.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: acrPullRoleId
  }
}

output AZURE_CONTAINER_REGISTRY_ENDPOINT string = acr.properties.loginServer
output WEB_APP_NAME string = webApp.name
output WEB_APP_DEFAULT_HOSTNAME string = webApp.properties.defaultHostName
