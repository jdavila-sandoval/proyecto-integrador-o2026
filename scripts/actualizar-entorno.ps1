<#
.SYNOPSIS
    Sincroniza y reconecta el entorno de AWS Learner Lab para EduStream.
.DESCRIPTION
    Obtiene la nueva IP pública de EC2 tras un reinicio de sesión en Learner Lab,
    actualiza API Gateway, verifica las reglas de Security Group y prueba la conectividad.
#>

param(
    [string]$Region = "us-east-1",
    [string]$ApiId = "j72eps3z3f",
    [string]$IntegrationId = "8m5f8ar",
    [string]$InstanceId = "i-0da66503c5157fdcd",
    [string]$SecurityGroupId = "sg-0108695f0d2701501"
)

$ErrorActionPreference = "Stop"

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "   EduStream - Sincronizador de AWS Learner Lab" -ForegroundColor Cyan
Write-Host "=======================================================`n" -ForegroundColor Cyan

# 1. Verificar credenciales de AWS
Write-Host "[1/5] Verificando credenciales de AWS..." -NoNewline
try {
    $identityJson = aws sts get-caller-identity 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw $identityJson
    }
    Write-Host " [OK]" -ForegroundColor Green
    $identity = $identityJson | ConvertFrom-Json
    Write-Host "      Cuenta: $($identity.Account) | Usuario: $($identity.Arn.Split('/')[-1])" -ForegroundColor Gray
}
catch {
    Write-Host " [ERROR]" -ForegroundColor Red
    Write-Host "`n[!] Tus credenciales de AWS han expirado o no son válidas." -ForegroundColor Yellow
    Write-Host "    1. Ve a AWS Academy Learner Lab y haz clic en 'AWS Details'." -ForegroundColor Yellow
    Write-Host "    2. Copia el bloque de 'AWS CLI' y pégalo en C:\Users\<tu-usuario>\.aws\credentials." -ForegroundColor Yellow
    Write-Host "    3. Vuelve a ejecutar este script.`n" -ForegroundColor Yellow
    exit 1
}

# 2. Consultar estado e IP de la instancia EC2
Write-Host "[2/5] Consultando estado de la instancia EC2 ($InstanceId)..." -NoNewline
$instanceData = aws ec2 describe-instances --instance-ids $InstanceId --region $Region 2>&1 | ConvertFrom-Json
$instance = $instanceData.Reservations[0].Instances[0]
$state = $instance.State.Name

if ($state -eq "stopped") {
    Write-Host " [DETENIDA]" -ForegroundColor Yellow
    Write-Host "      Iniciando instancia..." -NoNewline
    aws ec2 start-instances --instance-ids $InstanceId --region $Region | Out-Null
    Write-Host " Esperando a que esté en ejecución..." -NoNewline
    aws ec2 wait instance-running --instance-ids $InstanceId --region $Region
    $instanceData = aws ec2 describe-instances --instance-ids $InstanceId --region $Region | ConvertFrom-Json
    $instance = $instanceData.Reservations[0].Instances[0]
    Write-Host " [LISTA]" -ForegroundColor Green
} elseif ($state -ne "running") {
    Write-Host " [ESTADO: $state]" -ForegroundColor Yellow
    Write-Host "      Esperando a que esté en estado 'running'..."
    aws ec2 wait instance-running --instance-ids $InstanceId --region $Region
    $instanceData = aws ec2 describe-instances --instance-ids $InstanceId --region $Region | ConvertFrom-Json
    $instance = $instanceData.Reservations[0].Instances[0]
} else {
    Write-Host " [EN EJECUCIÓN]" -ForegroundColor Green
}

$publicIp = $instance.PublicIpAddress
if (-not $publicIp) {
    Write-Host "`n[!] No se pudo obtener la IP pública de la instancia." -ForegroundColor Red
    exit 1
}
Write-Host "      IP Pública detectada: $publicIp" -ForegroundColor Cyan

# 3. Asegurar regla del puerto 8000 en el Security Group
Write-Host "[3/5] Verificando Security Group ($SecurityGroupId)..." -NoNewline
$sgRules = aws ec2 describe-security-groups --group-ids $SecurityGroupId --region $Region | ConvertFrom-Json
$hasPort8000 = $false
foreach ($rule in $sgRules.SecurityGroups[0].IpPermissions) {
    if ($rule.FromPort -eq 8000 -and $rule.ToPort -eq 8000) {
        $hasPort8000 = $true
        break
    }
}

if (-not $hasPort8000) {
    Write-Host " [Añadiendo regla 8000]" -ForegroundColor Yellow
    aws ec2 authorize-security-group-ingress --group-id $SecurityGroupId --protocol tcp --port 8000 --cidr 0.0.0.0/0 --region $Region | Out-Null
} else {
    Write-Host " [OK]" -ForegroundColor Green
}

# 4. Actualizar integración en API Gateway
Write-Host "[4/5] Actualizando API Gateway ($ApiId) -> http://${publicIp}:8000..." -NoNewline
$updateResult = aws apigatewayv2 update-integration `
    --api-id $ApiId `
    --integration-id $IntegrationId `
    --integration-uri "http://${publicIp}:8000" `
    --region $Region 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host " [ERROR]" -ForegroundColor Red
    Write-Host $updateResult
    exit 1
}
Write-Host " [OK]" -ForegroundColor Green

# 5. Comprobar vida de la API
Write-Host "[5/5] Probando conectividad con la API (/health)..." -NoNewline
Start-Sleep -Seconds 2

$healthUrl = "https://${ApiId}.execute-api.${Region}.amazonaws.com/health"
try {
    $healthResp = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 10
    if ($healthResp.status -eq "ok") {
        Write-Host " [OK - API Respondiendo]" -ForegroundColor Green
    } else {
        Write-Host " [RESPUESTA INESPERADA]" -ForegroundColor Yellow
    }
}
catch {
    Write-Host " [REINTENTANDO]" -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    try {
        $healthResp = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 10
        Write-Host " [OK - API Respondiendo]" -ForegroundColor Green
    } catch {
        Write-Host " [FALLÓ: $($_.Exception.Message)]" -ForegroundColor Red
        Write-Host "      Revisa si el contenedor Docker está iniciado en EC2." -ForegroundColor Yellow
    }
}

# Resumen
Write-Host "`n-------------------------------------------------------" -ForegroundColor Cyan
Write-Host " ¡Todo listo! Tu entorno está sincronizado en la nube." -ForegroundColor Green
Write-Host "-------------------------------------------------------" -ForegroundColor Cyan
Write-Host "  Frontend:  https://4q76jvcjwa.execute-api.us-east-1.amazonaws.com" -ForegroundColor White
Write-Host "  API:       https://${ApiId}.execute-api.${Region}.amazonaws.com" -ForegroundColor White
Write-Host "  Docente:   docente@iteso.mx / Password123!" -ForegroundColor Gray
Write-Host "  Alumno:    alumno@iteso.mx / Password123!" -ForegroundColor Gray
Write-Host "-------------------------------------------------------`n" -ForegroundColor Cyan
