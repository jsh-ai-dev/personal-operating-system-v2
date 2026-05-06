# AWS 데이터 서비스 체크리스트 (학습용 저비용)

## mk1 / mk2 Postgres (RDS)

- 엔진: PostgreSQL 16
- 인스턴스 클래스: `db.t4g.micro` (학습용)
- 스토리지: gp3 20GB, autoscaling off
- Multi-AZ: off
- Public access: off
- SG: `sg-k8s-node`에서 `5432`만 허용

권장 생성:

- `rds-mk1-postgres`
- `rds-mk2-postgres`

## mk1 / mk2 Redis (ElastiCache)

- 엔진: Redis OSS 7.x
- 노드 타입: `cache.t4g.micro`
- replicas: 0 (학습용 단일 노드)
- Multi-AZ: off
- at-rest / in-transit encryption: on (가능하면)
- SG: `sg-k8s-node`에서 `6379` 허용

권장 생성:

- `redis-mk1`
- `redis-mk2`

## mk1 Elasticsearch (EC2 t3.small)

- OS: Amazon Linux 2023
- 디스크: gp3 30GB
- Docker 단일 컨테이너로 실행
- SG: `sg-k8s-node`에서 `9200`만 허용

예시 실행:

```bash
docker run -d --name mk1-es \
  -p 9200:9200 \
  -e discovery.type=single-node \
  -e xpack.security.enabled=false \
  -v esdata:/usr/share/elasticsearch/data \
  docker.elastic.co/elasticsearch/elasticsearch:8.13.4
```

## mk3 MongoDB / Qdrant (EC2 t3.small)

RDS로는 MongoDB/Qdrant를 직접 운영하지 못하므로, 학습 단계는 EC2 self-host가 가장 현실적이다.

- MongoDB: `mongo:7`
- Qdrant: `qdrant/qdrant:v1.14.1`
- SG: `sg-k8s-node`에서 `27017`, `6333`, `6334` 허용

예시 compose:

```yaml
services:
  mongodb:
    image: mongo:7
    ports: ["27017:27017"]
    volumes: ["mongo_data:/data/db"]
  qdrant:
    image: qdrant/qdrant:v1.14.1
    ports: ["6333:6333", "6334:6334"]
    volumes: ["qdrant_data:/qdrant/storage"]
volumes:
  mongo_data: {}
  qdrant_data: {}
```

## 배포 전 전달값 정리

아래 endpoint를 각 리포의 `k8s/overlays/aws` secret/config에 주입한다.

- mk1: RDS endpoint, Redis endpoint, Elasticsearch endpoint
- mk2: RDS endpoint, Redis endpoint
- mk3: Mongo endpoint, Qdrant endpoint/API key
