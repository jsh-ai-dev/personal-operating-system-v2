# AWS 학습 배포 런북 (mk1~mk3)

이 문서는 현재 저장소 상태를 기준으로, 저비용 학습 목적의 AWS 배포를 반복 가능한 절차로 정리한 실행 가이드다.

## 1) kind/k8s 실습 범위 재확인 결과

- `mk1`, `mk2`, `mk3` 모두 `k8s` 매니페스트는 존재한다.
- 커밋 히스토리 기준으로 `mk3 k8s`는 나중에 추가되었으므로, 초기 실습 베이스는 `mk1/mk2`였을 가능성이 높다.
- 이번 AWS 학습 배포의 기준 베이스는 `mk2`로 고정한다.

근거 파일:

- `D:/dev/personal-operating-system-mk1/k8s/README.md`
- `D:/dev/personal-operating-system-mk2/k8s/README.md`
- `D:/dev/personal-operating-system-mk3/k8s/README.md`

## 2) 서비스 배치 결정 (비용 최적화)

### Kubernetes (EC2 t3.large)

- `mk1-app`
- `mk2-web`
- `mk2-auth`
- `mk2-api`
- `mk3-web`
- `mk3-api`

### Managed / 외부 서비스

- RDS: `mk1-postgres`, `mk2-postgres`
- ElastiCache: `mk1-redis`, `mk2-redis`
- EC2 t3.small: `mk1-elasticsearch`
- 별도 소형 EC2 (Docker): `mk3-mongodb`, `mk3-qdrant`

참고: MongoDB/Qdrant는 RDS 대상이 아니다. 학습 단계에서는 별도 EC2 self-host가 가장 저렴하고 디버깅도 단순하다.

## 3) AWS 기반 인프라 준비

### 네트워크

1. VPC 1개 생성 (예: `10.20.0.0/16`)
2. 퍼블릭 서브넷 2개, 프라이빗 서브넷 2개
3. 라우팅:
   - 퍼블릭: IGW 연결
   - 프라이빗: NAT Gateway(비용 아끼려면 단일 AZ 1개)

### EC2

1. `t3.large` 1대: k8s 단일노드
2. `t3.small` 1대: Elasticsearch
3. `t3.small` 1대: MongoDB + Qdrant (Docker)

### 보안그룹 기본 규칙

- `sg-k8s-node`
  - inbound: `22` (내 IP), `80/443` (필요 시), `6443`(관리용 내부)
  - outbound: all
- `sg-rds-mk1`, `sg-rds-mk2`
  - inbound: `5432` from `sg-k8s-node`
- `sg-redis-mk1`, `sg-redis-mk2`
  - inbound: `6379` from `sg-k8s-node`
- `sg-es`
  - inbound: `9200` from `sg-k8s-node`
- `sg-mk3-data`
  - inbound: `27017`, `6333`, `6334` from `sg-k8s-node`

## 4) k8s 단일노드 설치 (k3s 권장)

`t3.large`에서:

```bash
curl -sfL https://get.k3s.io | sh -
sudo kubectl get nodes
```

로컬 개발PC에서:

```bash
scp -i <key.pem> ec2-user@<k8s-ec2-ip>:/etc/rancher/k3s/k3s.yaml ~/.kube/config-pos-aws
KUBECONFIG=~/.kube/config-pos-aws kubectl get nodes
```

## 5) ECR 이미지 빌드/푸시

각 저장소에서 공통 패턴으로 진행:

```bash
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker build -t <image-name>:<tag> -f <Dockerfile> .
docker tag <image-name>:<tag> <account>.dkr.ecr.<region>.amazonaws.com/<repo>:<tag>
docker push <account>.dkr.ecr.<region>.amazonaws.com/<repo>:<tag>
```

## 6) 앱 배포 순서 (실습용 권장)

1. `mk2-auth`, `mk2-api`, `mk2-web`
2. `mk1-app`
3. `mk3-api`, `mk3-web`

배포 명령 패턴:

```bash
kubectl apply -k k8s/overlays/aws
kubectl -n <namespace> get deploy,svc,ingress,pods
```

## 7) 검증 체크리스트

1. Pod Ready 여부
2. 각 앱에서 외부 DB/Redis 접속 성공 로그
3. mk1에서 Elasticsearch 인덱스/검색 성공
4. mk3에서 MongoDB 쓰기 + Qdrant upsert/search 성공
5. Ingress 경유로 API/Web 라우팅 정상

## 8) 비용 제어 (학습 환경 필수)

1. EventBridge + Lambda로 야간 자동 stop/start
2. CloudWatch 알람:
   - EC2 CPU
   - 디스크 사용량
   - RDS FreeStorage
3. 실습 종료 시 RDS/ElastiCache/EC2 종료 또는 스냅샷 후 삭제

## 9) 트러블슈팅 시작점

- k8s 리소스: `kubectl describe pod <pod>`
- 앱 로그: `kubectl logs deploy/<name> -n <namespace>`
- 네트워크: `kubectl exec -it <pod> -- sh` 후 `nc`/`curl` 테스트
- AWS SG/NACL/RouteTable을 먼저 확인 (대부분 연결 이슈 원인)
