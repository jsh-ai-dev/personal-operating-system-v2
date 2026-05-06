param(
    [string]$Mk1Namespace = "pos-mk1",
    [string]$Mk2Namespace = "pos-mk2",
    [string]$Mk3Namespace = "pos-mk3"
)

$ErrorActionPreference = "Stop"

function Test-NamespaceWorkloads {
    param(
        [string]$Namespace,
        [string[]]$Deployments
    )

    Write-Host "== Namespace: $Namespace ==" -ForegroundColor Cyan
    kubectl -n $Namespace get deploy,svc,ingress

    foreach ($deployment in $Deployments) {
        Write-Host "Waiting rollout: $Namespace/$deployment" -ForegroundColor Yellow
        kubectl -n $Namespace rollout status "deploy/$deployment" --timeout=180s
    }

    Write-Host "Pod 상태 확인: $Namespace" -ForegroundColor Green
    kubectl -n $Namespace get pods -o wide
    Write-Host ""
}

Write-Host "[1/3] mk1 검증" -ForegroundColor Magenta
Test-NamespaceWorkloads -Namespace $Mk1Namespace -Deployments @("mk1-app")

Write-Host "[2/3] mk2 검증" -ForegroundColor Magenta
Test-NamespaceWorkloads -Namespace $Mk2Namespace -Deployments @("mk2-auth", "mk2-api", "mk2-web")

Write-Host "[3/3] mk3 검증" -ForegroundColor Magenta
Test-NamespaceWorkloads -Namespace $Mk3Namespace -Deployments @("mk3-api", "mk3-web")

Write-Host "전체 기본 검증 완료. 다음으로 앱별 연결 로그를 확인하세요." -ForegroundColor Green
