#!/bin/bash
set -e

REGION="us-east-1"
API_ID="j72eps3z3f"
INTEGRATION_ID="8m5f8ar"
INSTANCE_ID="i-0da66503c5157fdcd"
SG_ID="sg-0108695f0d2701501"

echo "======================================================="
echo "   EduStream - Sincronizador de AWS Learner Lab"
echo "======================================================="

echo -n "[1/5] Verificando credenciales de AWS... "
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "[ERROR]"
    echo "[!] Credenciales no válidas o expiradas."
    echo "    Actualiza tu archivo ~/.aws/credentials y reintenta."
    exit 1
fi
echo "[OK]"

echo -n "[2/5] Consultando estado de EC2 ($INSTANCE_ID)... "
STATE=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" --region "$REGION" --query "Reservations[0].Instances[0].State.Name" --output text)

if [ "$STATE" == "stopped" ]; then
    echo "[DETENIDA]"
    echo -n "      Iniciando instancia... "
    aws ec2 start-instances --instance-ids "$INSTANCE_ID" --region "$REGION" > /dev/null
    aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$REGION"
    echo "[LISTA]"
elif [ "$STATE" != "running" ]; then
    echo "[ESTADO: $STATE]"
    aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$REGION"
else
    echo "[EN EJECUCIÓN]"
fi

PUBLIC_IP=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" --region "$REGION" --query "Reservations[0].Instances[0].PublicIpAddress" --output text)
echo "      IP Pública detectada: $PUBLIC_IP"

echo -n "[3/5] Verificando Security Group ($SG_ID)... "
aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 8000 --cidr 0.0.0.0/0 --region "$REGION" 2>/dev/null || true
echo "[OK]"

echo -n "[4/5] Actualizando API Gateway ($API_ID) -> http://${PUBLIC_IP}:8000... "
aws apigatewayv2 update-integration \
    --api-id "$API_ID" \
    --integration-id "$INTEGRATION_ID" \
    --integration-uri "http://${PUBLIC_IP}:8000" \
    --region "$REGION" > /dev/null
echo "[OK]"

echo -n "[5/5] Probando conectividad con la API (/health)... "
sleep 2
HEALTH_URL="https://${API_ID}.execute-api.${REGION}.amazonaws.com/health"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")

if [ "$HTTP_STATUS" == "200" ]; then
    echo "[OK - 200]"
else
    echo "[HTTP $HTTP_STATUS - Revisa si el contenedor está activo]"
fi

echo "======================================================="
echo " ¡Todo listo! Tu entorno está sincronizado en la nube."
echo " Frontend: https://4q76jvcjwa.execute-api.us-east-1.amazonaws.com"
echo " API:      https://${API_ID}.execute-api.${REGION}.amazonaws.com"
echo "======================================================="
